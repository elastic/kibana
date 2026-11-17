/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Span } from '@opentelemetry/api';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';

import type { BaseGraphState, GraphInsightTypes } from '../../types';

export type TracedGraphState = Pick<
  BaseGraphState<GraphInsightTypes>,
  | 'errors'
  | 'generationAttempts'
  | 'generations'
  | 'hallucinationFailures'
  | 'maxGenerationAttempts'
  | 'maxHallucinationFailures'
  | 'refinements'
>;

const ATTRIBUTE_PREFIX = 'attack_discovery';

/** Records the retry counters held in graph state as span attributes. */
export const setGraphCounterAttributes = (
  span: Span | undefined,
  {
    errors,
    generationAttempts,
    generations,
    hallucinationFailures,
    maxGenerationAttempts,
    maxHallucinationFailures,
    refinements,
  }: TracedGraphState
): void => {
  span?.setAttributes({
    [`${ATTRIBUTE_PREFIX}.errors_count`]: errors.length,
    [`${ATTRIBUTE_PREFIX}.generation_attempts`]: generationAttempts,
    [`${ATTRIBUTE_PREFIX}.generations_count`]: generations.length,
    [`${ATTRIBUTE_PREFIX}.hallucination_failures`]: hallucinationFailures,
    [`${ATTRIBUTE_PREFIX}.max_generation_attempts`]: maxGenerationAttempts,
    [`${ATTRIBUTE_PREFIX}.max_hallucination_failures`]: maxHallucinationFailures,
    [`${ATTRIBUTE_PREFIX}.refinements_count`]: refinements.length,
  });
};

/** Wraps a graph node in an `attack_discovery.<nodeName>` span that records the retry counters. */
export const withGraphNodeSpan =
  <S extends TracedGraphState>(nodeName: string, node: (state: S) => Promise<S>) =>
  (state: S): Promise<S> =>
    withActiveInferenceSpan(
      `${ATTRIBUTE_PREFIX}.${nodeName}`,
      { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' } },
      async (span) => {
        setGraphCounterAttributes(span, state);
        const result = await node(state);
        setGraphCounterAttributes(span, result);
        return result;
      }
    );
