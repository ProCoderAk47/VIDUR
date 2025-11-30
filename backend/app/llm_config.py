import os
import math
from dotenv import load_dotenv
import google.generativeai as genai

try:
    import tiktoken
except Exception:
    tiktoken = None

# Load environment variables from .env file
load_dotenv()

class LLMConfig:
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY') or os.environ.get('OPENAI_API_KEY')
    MODEL_NAME = os.environ.get('GEMINI_MODEL', 'gemini-2.0-flash')
    # Default max output tokens for Gemini
    DEFAULT_MAX_NEW_TOKENS = int(os.environ.get('LLM_MAX_NEW_TOKENS', '1024'))
    TEMPERATURE = float(os.environ.get('LLM_TEMPERATURE', '0.2'))
    TOP_P = float(os.environ.get('LLM_TOP_P', '0.95'))

class GeminiModel:
    def __init__(self):
        if not LLMConfig.GEMINI_API_KEY:
            raise RuntimeError('GEMINI_API_KEY not set')
        
        genai.configure(api_key=LLMConfig.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(LLMConfig.MODEL_NAME)

    def generate(self, prompt: str, max_new_tokens: int = None, temperature: float = None, top_p: float = None, stop=None) -> str:
        max_new_tokens = max_new_tokens or LLMConfig.DEFAULT_MAX_NEW_TOKENS
        temperature = temperature if temperature is not None else LLMConfig.TEMPERATURE
        top_p = top_p if top_p is not None else LLMConfig.TOP_P

        generation_config = genai.types.GenerationConfig(
            max_output_tokens=max_new_tokens,
            temperature=temperature,
            top_p=top_p,
            stop_sequences=stop
        )

        try:
            # Gemini doesn't use "system" role in the same way as OpenAI in generate_content for simple prompts,
            # but we can prepend it or use system_instruction if using 1.5 Pro/Flash.
            # For simplicity, we'll just pass the prompt. 
            # If the prompt structure in the app expects system messages, we might need to adapt.
            # The existing code constructed `messages` list.
            # Here we just take `prompt` string. 
            # Looking at OpenAIModel.generate, it took a `prompt` string and wrapped it in a user message, 
            # and added a system message "You are an expert legal summarizer."
            
            # We should probably preserve that system instruction.
            full_prompt = f"System: You are an expert legal summarizer.\n\nUser: {prompt}"
            
            response = self.model.generate_content(full_prompt, generation_config=generation_config)
            return response.text
        except Exception as e:
            raise

    def count_tokens(self, text: str) -> int:
        try:
            return self.model.count_tokens(text).total_tokens
        except Exception:
            # Fallback if API fails
            return math.ceil(len(text) / 4)
    
    def truncate_to_token_limit(self, text: str, max_tokens: int) -> str:
        """
        Truncate text to fit within token limit.
        """
        if tiktoken:
            try:
                # Use cl100k_base as approximation for Gemini (it's not exact but close enough for truncation)
                enc = tiktoken.get_encoding('cl100k_base')
                tokens = enc.encode(text)
                if len(tokens) > max_tokens:
                    truncated_tokens = tokens[:max_tokens]
                    return enc.decode(truncated_tokens)
                return text
            except Exception:
                pass
        
        # Fallback: approximate character-based truncation
        approx_chars = max_tokens * 4
        if len(text) > approx_chars:
            return text[:approx_chars]
        
        return text

# singleton accessor
_llm = None
def get_llm_model():
    global _llm
    if _llm is None:
        try:
            _llm = GeminiModel()
        except Exception as e:
            print(f"[LLM WARNING] Could not initialize GeminiModel: {e}")
            _llm = None
    return _llm
