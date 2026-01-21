"""
AIC Orchestrator Service
Handles pipeline execution: DAG parsing, step execution, and run coordination
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import redis
import httpx
import os
import asyncio
from dotenv import load_dotenv
from typing import Dict, Any, List
import json
import time
from datetime import datetime
from llm import LLMService
from tools import ToolRegistry

load_dotenv()

app = FastAPI(title="AIC Orchestrator", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/aic_db")
API_URL = os.getenv("API_URL", "http://localhost:3000")

redis_client = redis.from_url(REDIS_URL, decode_responses=True)


class StepExecutor:
    """Executes individual pipeline steps"""
    
    def __init__(self):
        self.llm_service = LLMService()
        self.tool_registry = ToolRegistry(self.llm_service)
    
    async def execute_step(self, step: Dict[str, Any], inputs: Dict[str, Any], policies: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute a single pipeline step"""
        step_type = step.get("type")
        step_id = step.get("id")
        
        policies = policies or {}
        
        if step_type == "tool":
            return await self._execute_tool_step(step, inputs, policies)
        elif step_type == "agent":
            return await self._execute_agent_step(step, inputs, policies)
        elif step_type == "condition":
            return await self._execute_condition_step(step, inputs)
        else:
            raise ValueError(f"Unknown step type: {step_type}")
    
    async def _execute_tool_step(self, step: Dict[str, Any], inputs: Dict[str, Any], policies: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool step"""
        tool_name = step.get("config", {}).get("tool", step.get("id"))
        
        # Check if tool is allowed
        allowed_tools = policies.get("allowedTools", [])
        if allowed_tools and tool_name not in allowed_tools:
            raise ValueError(f"Tool {tool_name} is not allowed by policy")
        
        # Execute tool using registry
        try:
            tool_config = step.get("config", {})
            result = await self.tool_registry.execute_tool(tool_name, tool_config, inputs)
            
            # Format result with step ID prefix
            formatted_result = {}
            for key, value in result.items():
                formatted_result[f"{step['id']}_{key}" if not key.startswith(step['id']) else key] = value
            
            return formatted_result
        except Exception as e:
            raise Exception(f"Tool execution error: {str(e)}")
    
    async def _execute_agent_step(self, step: Dict[str, Any], inputs: Dict[str, Any], policies: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an agent/LLM step"""
        prompt_template = step.get("config", {}).get("prompt", "Analyze the input")
        
        # Interpolate prompt template with inputs
        prompt = self._interpolate_template(prompt_template, inputs)
        
        # Get LLM config from step config or use defaults
        provider = step.get("config", {}).get("provider", "auto")
        model = step.get("config", {}).get("model")
        max_tokens = step.get("config", {}).get("max_tokens")
        temperature = step.get("config", {}).get("temperature", 0.7)
        system_prompt = step.get("config", {}).get("system_prompt")
        
        try:
            # Call LLM service
            llm_result = await self.llm_service.generate(
                prompt=prompt,
                provider=provider,
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system_prompt=system_prompt,
            )
            
            content = llm_result.get("content", "")
            
            # Try to parse JSON if it looks like JSON
            try:
                # Check if content looks like JSON
                if content.strip().startswith("{") or content.strip().startswith("["):
                    parsed = json.loads(content)
                    return {
                        f"{step['id']}_output": parsed,
                        "content": content,
                        "input_tokens": llm_result.get("input_tokens", 0),
                        "output_tokens": llm_result.get("output_tokens", 0),
                        "total_tokens": llm_result.get("total_tokens", 0),
                        "cost": llm_result.get("cost", 0),
                        "model": llm_result.get("model", ""),
                    }
            except:
                pass
            
            return {
                f"{step['id']}_output": content,
                "content": content,
                "input_tokens": llm_result.get("input_tokens", 0),
                "output_tokens": llm_result.get("output_tokens", 0),
                "total_tokens": llm_result.get("total_tokens", 0),
                "cost": llm_result.get("cost", 0),
                "model": llm_result.get("model", ""),
            }
        except Exception as e:
            raise Exception(f"LLM execution error: {str(e)}")
    
    def _interpolate_template(self, template: str, context: Dict[str, Any]) -> str:
        """Interpolate template variables like {{variable}}"""
        import re
        def replace_var(match):
            var = match.group(1).strip()
            value = context
            for key in var.split("."):
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    # Try to get from nested outputs
                    for k, v in context.items():
                        if isinstance(v, dict) and key in v:
                            value = v[key]
                            break
                    else:
                        return match.group(0)
            return str(value) if value is not None else ""
        
        return re.sub(r'\{\{([^}]+)\}\}', replace_var, template)
    
    @staticmethod
    async def _execute_condition_step(step: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a condition step"""
        condition = step.get("config", {}).get("condition", "true")
        # Simple condition evaluation (in production, use proper expression evaluator)
        return {
            "condition_result": True,
            "condition": condition
        }


class PipelineOrchestrator:
    """Orchestrates pipeline execution"""
    
    def __init__(self):
        self.executor = StepExecutor()
    
    def topological_sort(self, dag: Dict[str, Any]) -> List[str]:
        """Topological sort of DAG nodes"""
        nodes = {node["id"]: node for node in dag["nodes"]}
        edges = dag.get("edges", [])
        
        # Build graph
        in_degree = {node_id: 0 for node_id in nodes}
        graph = {node_id: [] for node_id in nodes}
        
        for edge in edges:
            from_id = edge["from"]
            to_id = edge["to"]
            if from_id in graph:
                graph[from_id].append(to_id)
                in_degree[to_id] = in_degree.get(to_id, 0) + 1
        
        # Find nodes with no incoming edges
        queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
        result = []
        
        while queue:
            node_id = queue.pop(0)
            result.append(node_id)
            
            for neighbor in graph.get(node_id, []):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        if len(result) != len(nodes):
            raise ValueError("Pipeline DAG contains cycles")
        
        return result
    
    async def execute_pipeline(
        self,
        run_id: str,
        pipeline: Dict[str, Any],
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a pipeline"""
        steps_dag = pipeline["steps"]
        policies = pipeline.get("policies", {})
        
        # Update run status to running
        await self._update_run_status(run_id, "running", {"startedAt": datetime.utcnow().isoformat()})
        
        try:
            # Topological sort to determine execution order
            execution_order = self.topological_sort(steps_dag)
            nodes = {node["id"]: node for node in steps_dag["nodes"]}
            
            # Track step runs
            step_runs = {}
            current_outputs = inputs.copy()
            total_cost = 0.0
            total_tokens = 0
            
            # Create step run records
            for idx, step_id in enumerate(execution_order):
                step = nodes[step_id]
                step_run_data = {
                    "stepId": step_id,
                    "stepType": step["type"],
                    "toolUsed": step.get("config", {}).get("tool") if step["type"] == "tool" else None,
                    "status": "pending",
                    "orderIndex": idx,
                    "inputs": json.dumps(current_outputs)
                }
                
                # Create step run via API
                step_run_id = await self._create_step_run(run_id, step_run_data)
                step_runs[step_id] = step_run_id
            
            # Execute steps in order
            for step_id in execution_order:
                step = nodes[step_id]
                step_run_id = step_runs[step_id]
                
                step_start_time = time.time()
                
                # Update step status to running
                await self._update_step_run(step_run_id, {"status": "running", "startedAt": datetime.utcnow().isoformat()})
                
                try:
                    # Execute step
                    step_output = await self.executor.execute_step(step, current_outputs, policies)
                    
                    step_latency = int((time.time() - step_start_time) * 1000)
                    
                    # Extract cost and tokens from step output (if LLM step)
                    step_cost = step_output.get("cost", 0.0)
                    step_tokens = step_output.get("total_tokens", step_output.get("output_tokens", 0))
                    
                    # Remove internal fields from output
                    output_to_store = {k: v for k, v in step_output.items() if k not in ["cost", "input_tokens", "output_tokens", "total_tokens", "model"]}
                    step_output = output_to_store
                    
                    total_cost += step_cost
                    total_tokens += step_tokens
                    
                    # Handle approval steps
                    if step["type"] == "approval":
                        await self._update_run_status(run_id, "needs_approval")
                        await self._create_approval(run_id, step_id)
                        # Pause execution until approval
                        return {"status": "needs_approval", "message": "Waiting for approval"}
                    
                    # Update step run with results
                    await self._update_step_run(
                        step_run_id,
                        {
                            "status": "completed",
                            "outputs": json.dumps(step_output),
                            "cost": step_cost,
                            "tokensUsed": step_tokens,
                            "latencyMs": step_latency,
                            "finishedAt": datetime.utcnow().isoformat()
                        }
                    )
                    
                    # Merge outputs for next steps
                    current_outputs.update(step_output)
                    
                except Exception as e:
                    # Step failed
                    await self._update_step_run(
                        step_run_id,
                        {
                            "status": "failed",
                            "errorMessage": str(e),
                            "finishedAt": datetime.utcnow().isoformat()
                        }
                    )
                    
                    # Update run status
                    await self._update_run_status(
                        run_id,
                        "failed",
                        {
                            "errorMessage": f"Step {step_id} failed: {str(e)}",
                            "finishedAt": datetime.utcnow().isoformat()
                        }
                    )
                    
                    raise
            
            # All steps completed successfully
            await self._update_run_status(
                run_id,
                "completed",
                {
                    "outputs": json.dumps(current_outputs),
                    "cost": total_cost,
                    "tokensUsed": total_tokens,
                    "finishedAt": datetime.utcnow().isoformat()
                }
            )
            
            return {"status": "completed", "outputs": current_outputs}
            
        except Exception as e:
            await self._update_run_status(
                run_id,
                "failed",
                {
                    "errorMessage": str(e),
                    "finishedAt": datetime.utcnow().isoformat()
                }
            )
            raise
    
    async def _update_run_status(self, run_id: str, status: str, data: Dict[str, Any] = None):
        """Update run status via Redis (API server will sync to DB)"""
        update_data = {"status": status}
        if data:
            update_data.update(data)
        
        # Store in Redis for API server to sync
        redis_client.set(
            f"run:update:{run_id}",
            json.dumps(update_data),
            ex=3600
        )
        
        # Also try to update via API directly (if available)
        try:
            async with httpx.AsyncClient() as client:
                await client.patch(
                    f"{API_URL}/api/v1/runs/{run_id}/status",
                    json=update_data,
                    timeout=2.0
                )
        except Exception:
            # API might not be available, that's ok - Redis sync will handle it
            pass
    
    async def _create_step_run(self, run_id: str, step_data: Dict[str, Any]) -> str:
        """Create step run record via API"""
        step_id = step_data['stepId']
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{API_URL}/api/v1/runs/{run_id}/steps",
                    json=step_data,
                    timeout=5.0
                )
                if response.status_code == 201:
                    result = response.json()
                    return result.get("id", f"{run_id}:step:{step_id}")
        except Exception as e:
            # If API fails, use mock ID and continue
            pass
        
        return f"{run_id}:step:{step_id}"
    
    async def _update_step_run(self, step_run_id: str, data: Dict[str, Any]):
        """Update step run record via API"""
        # Parse step_run_id format: "{run_id}:step:{step_id}"
        parts = step_run_id.split(":")
        if len(parts) != 3:
            # Fallback to Redis
            redis_client.set(f"step_run:{step_run_id}", json.dumps(data), ex=3600)
            return
        
        run_id, _, step_id = parts
        
        # Store in Redis for sync service
        redis_client.set(f"step_run:{step_run_id}", json.dumps(data), ex=3600)
        
        # Also try to update via API directly
        try:
            async with httpx.AsyncClient() as client:
                await client.patch(
                    f"{API_URL}/api/v1/runs/{run_id}/steps/{step_id}",
                    json=data,
                    timeout=2.0
                )
        except Exception:
            # API might not be available, that's ok - Redis sync will handle it
            pass
    
    async def _create_approval(self, run_id: str, step_id: str):
        """Create approval record (mock)"""
        redis_client.set(f"approval:{run_id}:{step_id}", json.dumps({"decision": "pending"}), ex=86400)


# API Endpoints

@app.get("/health")
async def health():
    return {"status": "ok", "service": "aic-orchestrator"}


@app.post("/api/v1/runs/{run_id}/start")
async def start_run(run_id: str, background_tasks: BackgroundTasks, request: Dict[str, Any]):
    """Start pipeline execution"""
    try:
        pipeline = request.get("pipeline")
        inputs = request.get("inputs")
        
        # Note: inputs can be an empty object; treat only None as missing.
        if pipeline is None or inputs is None:
            raise HTTPException(status_code=400, detail="Missing pipeline or inputs")
        
        orchestrator = PipelineOrchestrator()
        
        # Execute in background
        background_tasks.add_task(
            orchestrator.execute_pipeline,
            run_id,
            pipeline,
            inputs
        )
        
        return {"status": "accepted", "runId": run_id, "message": "Run started"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/runs/{run_id}/status")
async def get_run_status(run_id: str):
    """Get run status"""
    status_data = redis_client.get(f"run:update:{run_id}")
    if status_data:
        return json.loads(status_data)
    return {"status": "unknown"}


@app.post("/api/v1/runs/{run_id}/resume")
async def resume_run(run_id: str, background_tasks: BackgroundTasks, request: Dict[str, Any]):
    """Resume pipeline execution after approval"""
    try:
        pipeline = request.get("pipeline")
        inputs = request.get("inputs")
        
        if pipeline is None or inputs is None:
            raise HTTPException(status_code=400, detail="Missing pipeline or inputs")
        
        # Check if approval was approved
        approval_decision = request.get("decision")
        if approval_decision != "approved":
            raise HTTPException(status_code=400, detail="Run not approved")
        
        orchestrator = PipelineOrchestrator()
        
        # Resume execution in background
        background_tasks.add_task(
            orchestrator.execute_pipeline,
            run_id,
            pipeline,
            inputs
        )
        
        return {"status": "resumed", "runId": run_id, "message": "Run resumed"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    import asyncio
    uvicorn.run(app, host="0.0.0.0", port=8000)
