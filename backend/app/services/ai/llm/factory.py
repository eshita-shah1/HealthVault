from functools import lru_cache

from app.core.config import settings
from app.services.ai.llm.base import LLMProvider


@lru_cache
def get_llm_provider() -> LLMProvider:
    provider = settings.AI_PROVIDER.lower()
    if provider == "rule_based":
        from app.services.ai.llm.rule_based import RuleBasedLLMProvider

        return RuleBasedLLMProvider()
    if provider == "openai":
        from app.services.ai.llm.openai_provider import OpenAILLMProvider

        return OpenAILLMProvider()
    raise ValueError(f"Unknown AI_PROVIDER: {settings.AI_PROVIDER}")
