/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInferenceEndpointId, type EvalConnector } from '@kbn/evals';

/**
 * Subject models that must hold `capability` rows (see `HuntGate`). Both scored every CODE check
 * on every row across PR eval builds 2028 and 2098. Every other model gates on `invariant` rows
 * only, and its capability misses are reported.
 */
export const DEFAULT_REFERENCE_MODELS: readonly string[] = [
  'anthropic-claude-5.5-opus',
  'openai-gpt-6-sol',
];

/** Comma list of models; `all` gates capability rows for every model. */
export const REFERENCE_MODELS_ENV = 'HUNT_WATCH_REFERENCE_MODELS';

/**
 * One key per model across the names the stack uses for it: the EIS connector id
 * (`eis-openai-gpt-6-sol`, `-retryN` on a retried CI job), the inference id
 * (`.openai-gpt-6-sol-chat_completion`) and the catalog name (`openai-gpt-6-sol`).
 */
export const toModelKey = (id: string): string =>
  id
    .trim()
    .toLowerCase()
    .replace(/^\./, '')
    .replace(/^eis-/, '')
    .replace(/-chat_completion$/, '')
    .replace(/-retry\d+$/, '')
    .replace(/\./g, '-');

export const resolveReferenceModels = (
  raw: string | undefined = process.env[REFERENCE_MODELS_ENV]
): readonly string[] | 'all' => {
  if (raw === undefined || raw.trim() === '') return DEFAULT_REFERENCE_MODELS;
  if (raw.trim().toLowerCase() === 'all') return 'all';
  return raw.split(',').filter((entry) => entry.trim() !== '');
};

/**
 * Whether capability rows gate this subject model. A connector with no usable identifier
 * gates, so a subject the suite cannot name fails closed.
 */
export const gatesCapabilityRows = (
  connector: EvalConnector,
  reference: readonly string[] | 'all' = resolveReferenceModels()
): boolean => {
  if (reference === 'all') return true;
  const subjectKeys = [connector.id, getInferenceEndpointId(connector)]
    .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
    .map(toModelKey);
  if (subjectKeys.length === 0) return true;
  const referenceKeys = new Set(reference.map(toModelKey));
  return subjectKeys.some((key) => referenceKeys.has(key));
};
