"""Semantic filtering utilities using OpenAI GPT."""

from openai import OpenAI
from typing import Optional
from app.core.config import settings


# Global OpenAI client
_client: Optional[OpenAI] = None


def get_openai_client() -> OpenAI:
    """
    Get or create OpenAI client.
    
    Returns:
        OpenAI client instance
    """
    global _client
    
    if _client is None:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not set in environment variables")
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
        print("✅ OpenAI client initialized")
    
    return _client




def calculate_text_similarity(query: str, caption: str) -> float:
    """
    Calculate semantic similarity using OpenAI GPT model with prompt.
    
    Args:
        query: Search query text (e.g., "dog on snow")
        caption: Video frame caption text (e.g., "a brown dog is standing in the snow")
    
    Returns:
        Similarity score (0.0 to 1.0)
    """
    try:
        client = get_openai_client()
        
        # Create prompt asking GPT to match search term with caption
        prompt = f"""You are an expert video search assistant. Score how well a search term matches a video caption.

Return ONLY an integer from 0 to 100.

Search Term: "{query}"
Video Caption: "{caption}"

Follow these steps before scoring:
1) Extract: SUBJECT(S), ACTION(S), OBJECT(S), CONTEXT/ATTRIBUTES (location, scene, adjectives) from BOTH query and caption.
2) Normalize terms using synonyms, lemmatization, and category parents (hypernyms). Examples:
   - couple ≈ man+woman ≈ two people ≈ pair
   - person ≈ man ≈ woman ≈ individual
   - dog ≈ puppy ≈ canine
   - laying ≈ lying ≈ resting (≈ sleeping if unclear)
   - outside ≈ outdoors
   - child ≈ kid ≈ boy ≈ girl
   - toys ≈ playthings; thread/yarn ≈ craft material; toys and craft supplies share parent: "play/craft items"
3) Similarity rules (apply all that fit):
   A. SUBJECT MATCH (weight 0.40): exact, synonym, or parent-child (girl ≈ child). Penalize subject conflicts.
   B. ACTION MATCH (0.25): exact/close verbs (play vs playing), related-neutral (sitting can co-occur with play → partial credit), conflicting (sleeping vs running).
   C. OBJECT MATCH (0.25): exact, synonym, or category-sibling via a shared parent. (thread ↔ yarn ↔ craft material; toys ↔ playthings; both under "play/craft items" → partial).
   D. CONTEXT MATCH (0.10): locations/attributes (table/classroom/indoors/outdoors). Minor differences should not dominate.
4) Negative/contradictory cues lower the score (e.g., “cat” vs “dog”, “night” vs “day” if critical).
5) Favor recall: if the main subject aligns and objects/actions are plausible/related, award partial credit (don’t output near-zero unless clearly different).

SCORING BANDS:
- 95–100: Near-exact: core subject+action+object all align.
- 85–94: Strong: same core subject(s); action/object are synonyms or very close.
- 70–84: Good: main subject matches; action OR object related/sibling; context may differ.
- 50–69: Partial: related domain; only some elements match (e.g., subject matches; object is category sibling; action neutral).
- 0–49: Poor: different subjects or clearly unrelated.

Output: integer score 0–100 ONLY.

Your response (number only):"""

        # Call GPT-4o-mini (fast and cheap)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a precise video search matching assistant. Respond only with a number 0-100."},
                {"role": "user", "content": prompt}
            ],
            temperature=0,  # Deterministic
            max_tokens=10   # We only need a number
        )
        
        # Extract score from response
        score_text = response.choices[0].message.content.strip()
        
        # Parse score (handle cases like "85", "85%", etc.)
        score_text = score_text.replace('%', '').strip()
        score = float(score_text) / 100.0  # Convert to 0-1 range
        
        # Clamp to valid range
        score = max(0.0, min(1.0, score))
        
        return score
    
    except Exception as e:
        print(f"⚠️  OpenAI API error: {e}")
        # If OpenAI fails, return 0 (don't filter)
        return 0.0


def filter_results_by_semantic_similarity(
    query: str,
    results: list[tuple],
    threshold: float = 0.7
) -> list[tuple]:
    """
    Filter search results by semantic similarity between query and captions.
    
    Args:
        query: User search query (e.g., "dog on snow")
        results: List of (segment_id, video_id, timestamp_ms, frame_url, score, caption_json)
        threshold: Minimum similarity score to keep result (0.0 to 1.0, default 0.7 = 70%)
    
    Returns:
        Filtered list of results
    """
    
    if not results:
        return results
    
    print(f"\n🤖 OpenAI GPT Semantic Filtering - Threshold: {threshold*100}%")
    print(f"{'='*60}")
    
    filtered_results = []
    
    for i, result in enumerate(results, 1):
        segment_id, video_id, timestamp_ms, frame_url, visual_score, caption_json = result
        
        # Extract caption text
        caption_text = caption_json.get('text', '') if caption_json else ''
        
        if not caption_text:
            print(f"  ⚠️  Result #{i}: No caption, skipping")
            continue
        
        # Calculate semantic similarity
        semantic_score = calculate_text_similarity(query, caption_text)
        
        # Determine if we keep this result
        passed = semantic_score >= threshold
        badge = "✅" if passed else "❌"
        
        timestamp = f"{timestamp_ms//60000}:{(timestamp_ms//1000)%60:02d}"
        print(f"  {badge} Result #{i}: semantic={semantic_score:.3f} ({semantic_score*100:.1f}%) at {timestamp}")
        print(f"       Caption: \"{caption_text[:60]}...\"" if len(caption_text) > 60 else f"       Caption: \"{caption_text}\"")
        
        if passed:
            filtered_results.append(result)
    
    print(f"\n✅ Passed filter: {len(filtered_results)}/{len(results)}")
    print(f"{'='*60}\n")
    
    return filtered_results

