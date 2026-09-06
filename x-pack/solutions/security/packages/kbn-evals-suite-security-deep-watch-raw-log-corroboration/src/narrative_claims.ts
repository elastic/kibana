/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Helpers for counting narrative claims in an Agent Builder converse response
 * without counting substring hits inside tool outputs (ES|QL result payloads
 * can contain hundreds of incidental matches).
 */

interface ResponseStepLike {
  type?: string;
  output?: unknown;
  message?: unknown;
}

interface ResponseLike {
  steps?: ResponseStepLike[];
  output?: unknown;
  message?: unknown;
}

function textFromUnknown(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const content = (value as { content?: unknown }).content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((part) => (part && typeof part === 'object' ? String((part as { text?: unknown }).text ?? '') : ''))
        .join('\n');
    }
  }
  return '';
}

/**
 * Extracts only the model's own message text from a converse response:
 * assistant narrative steps and the final output — never tool outputs.
 */
export function getNarrativeText(response: ResponseLike): string {
  const parts: string[] = [];
  for (const step of response.steps ?? []) {
    // Assistant-authored steps only; tool result steps carry raw payloads.
    if (step.type === 'llm' || step.type === 'agent_message' || step.type === 'output_text') {
      parts.push(textFromUnknown(step.output) + textFromUnknown(step.message));
    }
  }
  parts.push(textFromUnknown(response.output) + textFromUnknown(response.message));
  return parts.join('\n');
}

/**
 * Counts distinct matched terms case-insensitively — "Gap", "gap", "Gaps" from
 * repeated headings collapse toward distinct claims rather than raw mentions.
 */
export function countDistinctClaims(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  if (!matches) return 0;
  return new Set(matches.map((m) => m.toLowerCase())).size;
}
