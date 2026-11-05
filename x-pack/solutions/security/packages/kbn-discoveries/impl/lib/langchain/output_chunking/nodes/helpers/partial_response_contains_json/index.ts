/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Whether a partial generation looks like part of the JSON document, rather
 * than the reasoning prose the prompts ask the model to show before it.
 *
 * When a response stops before the JSON section starts, `extractJson` returns
 * the reasoning prose unchanged; fed back on the next (continuation) call it
 * trips the input-side content filter on some models (claude-5.5-opus: every
 * remaining attempt refuses).
 *
 * A continuation fragment can start anywhere inside the JSON document —
 * including mid-string — so the check keys on the one stable difference: the
 * elicited reasoning sections open with markdown headings or bold labels.
 */
export const partialResponseContainsJson = (partialResponse: string): boolean => {
  const trimmed = partialResponse.trimStart();
  if (trimmed.length === 0) {
    return false; // empty response (e.g. a filtered completion): no JSON to continue from
  }
  return !trimmed.startsWith('#') && !trimmed.startsWith('**');
};
