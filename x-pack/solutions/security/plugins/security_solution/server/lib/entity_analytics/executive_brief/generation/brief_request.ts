/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from 'gpt-tokenizer';
import type {
  BriefNarrationMode,
  BriefSnapshot,
  ExecutiveBriefJob,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { BRIEF_OUTPUT_SCHEMA, BRIEF_SYSTEM_PROMPT, buildBriefPayload } from './brief_prompt';

export type BriefEstimate = NonNullable<ExecutiveBriefJob['estimate']>;

/** Describes the single forced tool; identical to the description `inference.output()` uses. */
export const STRUCTURED_OUTPUT_TOOL_DESCRIPTION = `Use the following schema to respond to the user's request in structured data, so it can be parsed and handled.`;

/** The user message: the same text for the template estimate and the inference call. */
export const buildBriefInput = (snapshot: BriefSnapshot, mode: BriefNarrationMode): string =>
  `Snapshot (JSON). Narrate it in ${
    mode === 'names' ? 'entity display names' : 'ENT ids (no names are available)'
  }:\n${buildBriefPayload(snapshot, mode)}`;

/**
 * Pre-call estimate of what an LLM run sends: the system prompt, the input and the tool
 * definition (description and schema). `gpt-tokenizer` approximates OpenAI tokenisation, so
 * Claude or Gemini counts differ (typically by tens of percent); treat it as an order of magnitude.
 * Falls back to chars / 4 if the tokenizer cannot run.
 */
export const estimateBriefPrompt = (
  snapshot: BriefSnapshot,
  mode: BriefNarrationMode
): BriefEstimate => {
  const input = buildBriefInput(snapshot, mode);
  const payloadBytes = Buffer.byteLength(input, 'utf8');
  const sent = [
    BRIEF_SYSTEM_PROMPT,
    input,
    STRUCTURED_OUTPUT_TOOL_DESCRIPTION,
    JSON.stringify(BRIEF_OUTPUT_SCHEMA),
  ].join('\n');
  try {
    return { promptTokens: encode(sent).length, payloadBytes, method: 'tokenizer' };
  } catch {
    return { promptTokens: Math.ceil(sent.length / 4), payloadBytes, method: 'chars_div_4' };
  }
};
