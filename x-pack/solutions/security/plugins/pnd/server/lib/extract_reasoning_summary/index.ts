/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Upper bound mirrors the proposal-row `reasoning` field (`@kbn/pnd-common`). */
const MAX_REASONING_LENGTH = 8192;

/**
 * The key holding the long-form narrative the PND orchestrators put beside `summary`. It is excluded
 * from the fallback — see {@link extractReasoningSummary}.
 */
const REASONING_NARRATIVE_KEY = 'sections';

/**
 * Reduce the free-form `output.reasoning` object that Workflows resolves from the
 * `data.set` step immediately before each gate into the single string a proposal row
 * renders. The PND orchestrators emit `{ summary, sections: [{ title, body }] }`
 * (see `kbn-workflows/managed/definitions/pnd/watch_deep.yaml`), so `summary` is the
 * concise human line; when it is absent we fall back to a compact JSON serialization of
 * the **remaining** keys so no rationale is silently dropped.
 *
 * Security finding D3: the fallback deliberately omits `{@link REASONING_NARRATIVE_KEY}`. The
 * queue's `reasoning` field is a one-line human summary bounded at
 * {@link MAX_REASONING_LENGTH}, and serializing the raw object would put up to 8KB of
 * Attack Discovery narrative in front of any `pnd_read` holder the moment a YAML edit
 * stopped emitting `summary` — a fail-open disclosure one keystroke away, on a route whose
 * privilege never implied "read the discovery". Dropping the key makes the degraded case
 * *less* informative rather than *more* exposed.
 *
 * Returns an empty string when there is no reasoning left to render — the row schema allows
 * it, and an empty string reads correctly in the queue as "no rationale captured".
 */
export const extractReasoningSummary = (
  reasoning: Record<string, unknown> | undefined | null
): string => {
  if (reasoning == null) {
    return '';
  }

  const { summary } = reasoning;
  if (typeof summary === 'string' && summary.length > 0) {
    return summary.length > MAX_REASONING_LENGTH ? summary.slice(0, MAX_REASONING_LENGTH) : summary;
  }

  const withoutNarrative = Object.fromEntries(
    Object.entries(reasoning).filter(([key]) => key !== REASONING_NARRATIVE_KEY)
  );

  const serialized = JSON.stringify(withoutNarrative);
  if (serialized == null || serialized === '{}') {
    return '';
  }

  return serialized.length > MAX_REASONING_LENGTH
    ? serialized.slice(0, MAX_REASONING_LENGTH)
    : serialized;
};
