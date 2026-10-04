/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Confidence extraction for the raw-log corroboration L2 gate.
 *
 * The dataset declares `expected.minConfidence` per scenario, but the scorer
 * never read it: `minConfidence` was a field nothing consumed, so a report that
 * stated no confidence at all — or an arbitrarily low one — scored exactly the
 * same as a confident one. `leaf_quality.spec.ts` now extracts the stated
 * confidence with this parser and ANDs `confidence >= minConfidence` into
 * `success`.
 *
 * The worker emits prose (see `src/types.ts` — the structured
 * `CorroborationReport` is the target shape, not the current one), so the
 * parser reads the machine-readable line the prompt requires
 * (`Confidence: <0-1>`, see `buildCorroborationPrompt`). Label spellings are
 * accepted as a fallback so a report that answers "Confidence: high" is scored
 * rather than dropped.
 */

const LABEL_CONFIDENCE: Record<string, number> = {
  high: 0.9,
  medium: 0.6,
  moderate: 0.6,
  low: 0.3,
  none: 0,
};

/**
 * Returns the confidence stated in `text`, or `undefined` when none is stated.
 *
 * Deliberately returns `undefined` rather than clamping for an out-of-range
 * number: `Confidence: 5` is not a 100% confidence, it is a report that did not
 * follow the requested format, and the gate should not be satisfiable by it.
 */
export const parseConfidence = (text: string): number | undefined => {
  const percent = /confidence[^0-9%\n]{0,20}(\d{1,3}(?:\.\d+)?)\s*%/i.exec(text);
  if (percent) {
    const value = Number(percent[1]) / 100;
    if (value >= 0 && value <= 1) return value;
  }

  // The capture must be the WHOLE numeric token: a single-digit pattern
  // (`(\d(?:\.\d+)?)`) matched the first digit of `Confidence: 12` and returned a
  // passing 1, so every value from 10 to 19 could make the confidence gate green
  // on a malformed report. The range check below is only meaningful once the
  // complete token reaches it.
  const decimal = /confidence[^0-9\n]{0,20}(\d+(?:\.\d+)?)/i.exec(text);
  if (decimal) {
    const value = Number(decimal[1]);
    if (value >= 0 && value <= 1) return value;
  }

  const label = /confidence[^a-z\n]{0,20}(high|medium|moderate|low|none)/i.exec(text);
  if (label) return LABEL_CONFIDENCE[label[1].toLowerCase()];

  return undefined;
};
