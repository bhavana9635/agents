"""
Tool implementations for pipeline steps
Includes web search, competitor analysis, and other tools
"""

import os
import json
import re
from typing import Dict, Any, List, Optional
import httpx
from tavily import TavilyClient


class WebSearchTool:
    """Web search tool using Tavily API"""
    
    def __init__(self):
        api_key = os.getenv("TAVILY_API_KEY")
        if api_key:
            self.client = TavilyClient(api_key=api_key)
        else:
            self.client = None
            print("Warning: TAVILY_API_KEY not set. Web search will use fallback.")
    
    async def search(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """Perform web search"""
        # Interpolate template variables
        query = self._interpolate_template(query, {})
        
        if not self.client:
            # Fallback to basic search results
            return {
                "results": [
                    {
                        "title": f"Result for: {query}",
                        "url": "https://example.com",
                        "content": f"Sample content related to {query}",
                    }
                ],
                "query": query,
                "fallback": True,
            }
        
        try:
            response = self.client.search(query=query, max_results=max_results, search_depth="advanced")
            
            results = []
            for result in response.get("results", []):
                results.append({
                    "title": result.get("title", ""),
                    "url": result.get("url", ""),
                    "content": result.get("content", ""),
                    "score": result.get("score", 0),
                })
            
            return {
                "results": results,
                "query": query,
                "sources": [r["url"] for r in results],
            }
        except Exception as e:
            raise Exception(f"Web search error: {str(e)}")
    
    def _interpolate_template(self, template: str, context: Dict[str, Any]) -> str:
        """Interpolate template variables like {{variable}}"""
        def replace_var(match):
            var = match.group(1).strip()
            value = context
            for key in var.split("."):
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return match.group(0)
            return str(value) if value is not None else ""
        
        return re.sub(r'\{\{([^}]+)\}\}', replace_var, template)


class CompetitorAnalysisTool:
    """Competitor analysis tool"""
    
    def __init__(self, web_search_tool: WebSearchTool, llm_service=None):
        self.web_search = web_search_tool
        self.llm_service = llm_service
    
    async def analyze(self, idea: str, search_results: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Analyze competitors for a given idea"""
        idea = self._interpolate_template(idea, {})
        
        # If search results provided, use them; otherwise perform search
        if search_results is None:
            search_query = f"{idea} competitors alternatives market analysis"
            search_results = await self.web_search.search(search_query, max_results=10)
        
        # Extract competitor information from search results
        competitors = []
        sources = []
        
        for result in search_results.get("results", [])[:5]:
            title = result.get("title", "")
            content = result.get("content", "")
            url = result.get("url", "")
            
            # Extract potential competitor names from title/content
            # This is a simple heuristic - in production, use LLM to extract structured data
            competitor_name = title.split("-")[0].strip() if "-" in title else title[:50]
            
            if competitor_name and competitor_name not in [c["name"] for c in competitors]:
                competitors.append({
                    "name": competitor_name,
                    "description": content[:200] if content else "",
                    "source": url,
                })
                sources.append(url)
        
        # If LLM service available, use it to refine analysis
        if self.llm_service and competitors:
            try:
                analysis_prompt = f"""Analyze the following startup idea and its competitors:

Idea: {idea}

Competitors found:
{json.dumps(competitors, indent=2)}

Provide a structured competitor analysis with:
1. Direct competitors (products solving the same problem)
2. Indirect competitors (alternative solutions)
3. Market gaps and opportunities

Format the response as JSON with competitors array and analysis."""
                
                llm_result = await self.llm_service.generate(
                    analysis_prompt,
                    provider="auto",
                    system_prompt="You are a competitive intelligence analyst. Provide structured, actionable insights.",
                    max_tokens=2000,
                    temperature=0.7,
                )
                
                # Try to parse JSON from LLM response
                content = llm_result.get("content", "")
                try:
                    # Extract JSON from markdown code blocks if present
                    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
                    if json_match:
                        analysis_data = json.loads(json_match.group(1))
                        return {
                            "idea": idea,
                            "competitors": analysis_data.get("competitors", competitors),
                            "analysis": analysis_data.get("analysis", content),
                            "sources": sources,
                            "llm_enhanced": True,
                        }
                except:
                    pass
                
                return {
                    "idea": idea,
                    "competitors": competitors,
                    "analysis": content,
                    "sources": sources,
                    "llm_enhanced": True,
                }
            except Exception as e:
                print(f"Warning: LLM competitor analysis failed: {e}")
        
        return {
            "idea": idea,
            "competitors": competitors,
            "sources": sources,
            "llm_enhanced": False,
        }
    
    def _interpolate_template(self, template: str, context: Dict[str, Any]) -> str:
        """Interpolate template variables like {{variable}}"""
        def replace_var(match):
            var = match.group(1).strip()
            value = context
            for key in var.split("."):
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return match.group(0)
            return str(value) if value is not None else ""
        
        return re.sub(r'\{\{([^}]+)\}\}', replace_var, template)


class ToolRegistry:
    """Registry for all available tools"""
    
    def __init__(self, llm_service=None):
        self.web_search = WebSearchTool()
        self.competitor_analysis = CompetitorAnalysisTool(self.web_search, llm_service)
        self.llm_service = llm_service
    
    async def execute_tool(self, tool_name: str, config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool by name"""
        # Interpolate config values with inputs
        interpolated_config = self._interpolate_dict(config, inputs)
        
        if tool_name == "web_search":
            query = interpolated_config.get("query", "")
            max_results = interpolated_config.get("max_results", 5)
            result = await self.web_search.search(query, max_results)
            return {
                "result": result,
                "query": query,
                "sources": result.get("sources", []),
            }
        
        elif tool_name == "competitor_analysis":
            idea = interpolated_config.get("idea", "")
            search_results = interpolated_config.get("searchResults")
            # If searchResults is a string, try to parse it
            if isinstance(search_results, str):
                try:
                    search_results = json.loads(search_results)
                except:
                    search_results = None
            result = await self.competitor_analysis.analyze(idea, search_results)
            return {
                "result": result,
                "competitors": result.get("competitors", []),
                "analysis": result.get("analysis", ""),
            }
        
        else:
            raise ValueError(f"Unknown tool: {tool_name}")
    
    def _interpolate_dict(self, config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively interpolate template variables in a dict"""
        result = {}
        for key, value in config.items():
            if isinstance(value, str):
                result[key] = self._interpolate_template(value, context)
            elif isinstance(value, dict):
                result[key] = self._interpolate_dict(value, context)
            elif isinstance(value, list):
                result[key] = [self._interpolate_template(str(v), context) if isinstance(v, str) else v for v in value]
            else:
                result[key] = value
        return result
    
    def _interpolate_template(self, template: str, context: Dict[str, Any]) -> str:
        """Interpolate template variables like {{variable}}"""
        def replace_var(match):
            var = match.group(1).strip()
            value = context
            for key in var.split("."):
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return match.group(0)
            return str(value) if value is not None else ""
        
        return re.sub(r'\{\{([^}]+)\}\}', replace_var, template)
