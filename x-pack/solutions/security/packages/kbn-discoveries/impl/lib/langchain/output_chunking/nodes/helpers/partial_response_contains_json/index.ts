/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Whether a partial generation can be combined into the JSON document, rather
 * than being reasoning prose the prompts ask the model to show before it.
 *
 * When a response stops before the JSON section starts, `extractJson` returns
 * the reasoning prose unchanged; fed back on the next (continuation) call it
 * trips the input-side content filter on some models (claude-5.5-opus: every
 * remaining attempt refuses).
 *
 * - First response (nothing accumulated): it cannot be a mid-string fragment, so
 *   it must open a JSON document (`{` or `[`; `extractJson` already strips a
 *   ```json fence). Any other text is reasoning prose.
 * - Continuation (JSON already accumulated): the fragment can start anywhere,
 *   including mid-string in markdown such as `**bold**` or `# heading`, so
 *   text is accepted unless it both opens like the elicited reasoning (a
 *   heading or bold label) and contains no `"` — a real continuation of a
 *   document eventually closes a string or opens a key, reasoning prose
 *   does not.
 */
export const partialResponseContainsJson = ({
  partialResponse,
  accumulatedJson,
}: {
  partialResponse: string;
  accumulatedJson: string;
}): boolean => {
  const trimmed = partialResponse.trimStart();
  if (trimmed.length === 0) {
    return false; // empty response (e.g. a filtered completion): no JSON to continue from
  }
  if (accumulatedJson.trim().length > 0) {
    const opensLikeReasoning = trimmed.startsWith('#') || trimmed.startsWith('**');
    return !opensLikeReasoning || trimmed.includes('"');
  }
  return trimmed.startsWith('{') || trimmed.startsWith('[');
};
