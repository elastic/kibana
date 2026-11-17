/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withActiveInferenceSpan } from '@kbn/inference-tracing';

import type { TracedGraphState } from './with_graph_node_span';
import { setGraphCounterAttributes, withGraphNodeSpan } from './with_graph_node_span';

const mockSetAttributes = jest.fn();
const mockSpan = { setAttributes: mockSetAttributes };

jest.mock('@kbn/inference-tracing', () => ({
  ElasticGenAIAttributes: { InferenceSpanKind: 'elastic.inference.span.kind' },
  withActiveInferenceSpan: jest.fn(
    (_name: string, _opts: unknown, cb: (span: unknown) => unknown) => cb(mockSpan)
  ),
}));

const baseState: TracedGraphState = {
  errors: [],
  generationAttempts: 0,
  generations: [],
  hallucinationFailures: 0,
  maxGenerationAttempts: 10,
  maxHallucinationFailures: 5,
  refinements: [],
};

describe('with_graph_node_span', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setGraphCounterAttributes', () => {
    it('records the graph state counters as span attributes', () => {
      setGraphCounterAttributes(mockSpan as never, {
        ...baseState,
        errors: ['e1'],
        generationAttempts: 3,
        generations: ['g1', 'g2'],
        hallucinationFailures: 2,
        refinements: ['r1'],
      });

      expect(mockSetAttributes).toHaveBeenCalledWith({
        'attack_discovery.errors_count': 1,
        'attack_discovery.generation_attempts': 3,
        'attack_discovery.generations_count': 2,
        'attack_discovery.hallucination_failures': 2,
        'attack_discovery.max_generation_attempts': 10,
        'attack_discovery.max_hallucination_failures': 5,
        'attack_discovery.refinements_count': 1,
      });
    });

    it('does nothing when tracing yields no span', () => {
      expect(() => setGraphCounterAttributes(undefined, baseState)).not.toThrow();
      expect(mockSetAttributes).not.toHaveBeenCalled();
    });
  });

  describe('withGraphNodeSpan', () => {
    it('opens a CHAIN inference span named after the node', async () => {
      await withGraphNodeSpan('generate', async (state: TracedGraphState) => state)(baseState);

      expect(withActiveInferenceSpan).toHaveBeenCalledWith(
        'attack_discovery.generate',
        { attributes: { 'elastic.inference.span.kind': 'CHAIN' } },
        expect.any(Function)
      );
    });

    it('records counters from the input state and from the state the node returns', async () => {
      const output: TracedGraphState = {
        ...baseState,
        generationAttempts: 1,
        generations: ['g1'],
        hallucinationFailures: 1,
      };

      const result = await withGraphNodeSpan('generate', async () => output)(baseState);

      expect(result).toBe(output);
      expect(mockSetAttributes).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          'attack_discovery.generation_attempts': 0,
          'attack_discovery.hallucination_failures': 0,
        })
      );
      expect(mockSetAttributes).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          'attack_discovery.generation_attempts': 1,
          'attack_discovery.generations_count': 1,
          'attack_discovery.hallucination_failures': 1,
        })
      );
    });

    it('still reports the input counters and rethrows when the node throws', async () => {
      const error = new Error('boom');
      const failing = withGraphNodeSpan('refine', async (): Promise<TracedGraphState> => {
        throw error;
      });

      await expect(
        failing({ ...baseState, generationAttempts: 4, refinements: ['r1', 'r2'] })
      ).rejects.toBe(error);

      expect(mockSetAttributes).toHaveBeenCalledTimes(1);
      expect(mockSetAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'attack_discovery.generation_attempts': 4,
          'attack_discovery.refinements_count': 2,
        })
      );
    });
  });
});
