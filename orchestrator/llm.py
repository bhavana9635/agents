"""
LLM Integration Module
Supports OpenAI and Anthropic APIs
"""

import os
import json
import re
from typing import Dict, Any, Optional
import tiktoken
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic


class LLMProvider:
    """Base class for LLM providers"""
    
    async def generate(self, prompt: str, model: Optional[str] = None, max_tokens: Optional[int] = None, temperature: float = 0.7) -> Dict[str, Any]:
        raise NotImplementedError
    
    def count_tokens(self, text: str) -> int:
        raise NotImplementedError
    
    def calculate_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        """Calculate cost in USD"""
        raise NotImplementedError


class OpenAIProvider(LLMProvider):
    """OpenAI API provider"""
    
    # Pricing per 1M tokens (as of 2024)
    PRICING = {
        "gpt-4-turbo-preview": {"input": 10.0, "output": 30.0},
        "gpt-4": {"input": 30.0, "output": 60.0},
        "gpt-3.5-turbo": {"input": 0.5, "output": 1.5},
        "gpt-4o": {"input": 2.5, "output": 10.0},
        "gpt-4o-mini": {"input": 0.15, "output": 0.6},
    }
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.client = AsyncOpenAI(api_key=api_key)
        self.encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
    
    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate text using OpenAI API"""
        model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        max_tokens = max_tokens or int(os.getenv("OPENAI_MAX_TOKENS", "2000"))
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            
            content = response.choices[0].message.content
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            total_tokens = response.usage.total_tokens
            cost = self.calculate_cost(input_tokens, output_tokens, model)
            
            return {
                "content": content,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens,
                "cost": cost,
                "model": model,
            }
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        return len(self.encoding.encode(text))
    
    def calculate_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        """Calculate cost in USD"""
        pricing = self.PRICING.get(model, self.PRICING["gpt-3.5-turbo"])
        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        return input_cost + output_cost


class AnthropicProvider(LLMProvider):
    """Anthropic Claude API provider"""
    
    # Pricing per 1M tokens (as of 2024)
    PRICING = {
        "claude-3-5-sonnet-20241022": {"input": 3.0, "output": 15.0},
        "claude-3-opus-20240229": {"input": 15.0, "output": 75.0},
        "claude-3-sonnet-20240229": {"input": 3.0, "output": 15.0},
        "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},
    }
    
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is required")
        self.client = AsyncAnthropic(api_key=api_key)
    
    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate text using Anthropic API"""
        model = model or os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307")
        max_tokens = max_tokens or int(os.getenv("ANTHROPIC_MAX_TOKENS", "2000"))
        
        try:
            response = await self.client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt or "",
                messages=[
                    {"role": "user", "content": prompt}
                ],
            )
            
            content = response.content[0].text
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            
            cost = self.calculate_cost(input_tokens, output_tokens, model)
            
            return {
                "content": content,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens,
                "cost": cost,
                "model": model,
            }
        except Exception as e:
            raise Exception(f"Anthropic API error: {str(e)}")
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text (approximation)"""
        # Rough approximation: 4 characters per token
        return len(text) // 4
    
    def calculate_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        """Calculate cost in USD"""
        pricing = self.PRICING.get(model, self.PRICING["claude-3-haiku-20240307"])
        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        return input_cost + output_cost


class MockProvider(LLMProvider):
    """Zero-cost mock LLM provider for local/testing use.

    - Requires no API key
    - Never makes network calls
    - Always reports 0 tokens and 0 cost
    """

    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        # Very simple deterministic behavior so pipelines still work
        combined_prompt = f"{system_prompt or ''}\n{prompt}".strip()
        # Truncate to avoid huge echoes
        preview = combined_prompt[:1000]
        content = (
            "MOCK LLM RESPONSE (no real model was called).\n\n"
            "Prompt preview:\n"
            f"{preview}"
        )

        return {
            "content": content,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "cost": 0.0,
            "model": model or "mock-llm",
        }

    def count_tokens(self, text: str) -> int:
        # Always 0 to keep cost/token accounting at zero
        return 0

    def calculate_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        # Always zero-cost
        return 0.0


class LLMService:
    """Service to manage LLM providers"""
    
    def __init__(self):
        self.openai = None
        self.anthropic = None
        self.mock = MockProvider()
        
        # Initialize providers if API keys are available
        if os.getenv("OPENAI_API_KEY"):
            try:
                self.openai = OpenAIProvider()
            except Exception as e:
                print(f"Warning: Could not initialize OpenAI: {e}")
        
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                self.anthropic = AnthropicProvider()
            except Exception as e:
                print(f"Warning: Could not initialize Anthropic: {e}")
    
    async def generate(
        self,
        prompt: str,
        provider: str = "auto",
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate text using the specified provider"""
        # Replace template variables in prompt
        prompt = self._interpolate_template(prompt, {})
        
        # Auto-select provider
        if provider == "auto":
            if self.openai:
                provider = "openai"
            elif self.anthropic:
                provider = "anthropic"
            else:
                # Fall back to zero-cost mock provider
                provider = "mock"
        
        if provider == "openai":
            if not self.openai:
                raise ValueError("OpenAI provider not initialized")
            return await self.openai.generate(prompt, model, max_tokens, temperature, system_prompt)
        elif provider == "anthropic":
            if not self.anthropic:
                raise ValueError("Anthropic provider not initialized")
            return await self.anthropic.generate(prompt, model, max_tokens, temperature, system_prompt)
        elif provider == "mock":
            # Always available, zero-cost local provider
            return await self.mock.generate(prompt, model, max_tokens, temperature, system_prompt)
        else:
            raise ValueError(f"Unknown provider: {provider}")
    
    def _interpolate_template(self, template: str, context: Dict[str, Any]) -> str:
        """Interpolate template variables like {{variable}}"""
        def replace_var(match):
            var = match.group(1).strip()
            # Try to get value from context, handling nested keys with dot notation
            value = context
            for key in var.split("."):
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return match.group(0)  # Return original if not found
            return str(value) if value is not None else ""
        
        return re.sub(r'\{\{([^}]+)\}\}', replace_var, template)
