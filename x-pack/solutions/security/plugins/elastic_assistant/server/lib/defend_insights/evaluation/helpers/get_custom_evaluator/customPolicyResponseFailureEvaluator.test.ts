/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example, Run } from 'langsmith';
import type {
  DefendInsights,
  DefendInsight,
  DefendInsightEvent,
} from '@kbn/elastic-assistant-common';

import type { ExampleOutput } from './customPolicyResponseFailureEvaluator';
import { EVALUATOR_ERRORS } from './constants';
import {
  customPolicyResponseFailureEvaluator,
  isValidExampleOutput,
} from './customPolicyResponseFailureEvaluator';

const createMockRun = (insights: DefendInsights): Run =>
  ({
    id: 'test-run-id',
    name: 'test-run',
    run_type: 'chain',
    inputs: {},
    outputs: {
      insights,
    },
    session_id: 'test-session',
    extra: {},
  } as Run);

const createMockExample = (insights: DefendInsights): Example =>
  ({
    id: 'test-example-id',
    created_at: '2025-01-01T00:00:00Z',
    runs: [],
    dataset_id: 'test-dataset',
    inputs: {},
    outputs: {
      insights,
    },
    extra: {},
  } as Example);

describe('customPolicyResponseFailureEvaluator', () => {
  const mockDefendInsight: DefendInsight = {
    group: 'policy-response-failure',
    events: [
      {
        id: 'event1',
        endpointId: 'endpoint1',
        value: 'test-value-1',
      },
      {
        id: 'event2',
        endpointId: 'endpoint2',
        value: 'test-value-2',
      },
    ],
    remediation: {
      message: 'Test remediation message for policy response failure',
      link: 'https://example.com/remediation',
    },
  };

  const mockDefendInsights: DefendInsights = [mockDefendInsight];
  const mockRun = createMockRun(mockDefendInsights);
  const mockExample = createMockExample(mockDefendInsights);

  const evaluator = customPolicyResponseFailureEvaluator as (
    run: Run,
    example: Example | undefined
  ) => { key: string; score: number; comment: string };

  describe('isValidExampleOutput', () => {
    it('should return true for valid ExampleOutput', () => {
      const validOutput: ExampleOutput = {
        insights: [
          {
            group: 'test-group',
            events: [{ id: 'event1', endpointId: 'endpoint1', value: 'value1' }],
            remediation: { message: 'Test message' },
          },
        ],
      };

      expect(isValidExampleOutput(validOutput)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isValidExampleOutput(null as unknown as ExampleOutput)).toBeFalsy();
      expect(isValidExampleOutput(undefined as unknown as ExampleOutput)).toBeFalsy();
    });

    it('should return false when insights is not an array', () => {
      const invalidOutput = {
        insights: 'not-an-array',
      };

      expect(isValidExampleOutput(invalidOutput as unknown as ExampleOutput)).toBe(false);
    });

    it('should return false when insights array contains invalid objects', () => {
      const invalidOutput: ExampleOutput = {
        insights: [
          {
            group: 'test-group',
            // missing events
            remediation: { message: 'Test message' },
          },
        ],
      };

      expect(isValidExampleOutput(invalidOutput)).toBe(false);
    });

    it('should return false when remediation message is not a string', () => {
      const invalidOutput: ExampleOutput = {
        insights: [
          {
            group: 'test-group',
            events: [],
            remediation: { message: 123 },
          },
        ],
      };

      expect(isValidExampleOutput(invalidOutput)).toBe(false);
    });

    it('should return false when events is not an array', () => {
      const invalidOutput: ExampleOutput = {
        insights: [
          {
            group: 'test-group',
            events: 'not-an-array' as unknown as DefendInsightEvent[],
            remediation: { message: 'Test message' },
          },
        ],
      };

      expect(isValidExampleOutput(invalidOutput)).toBe(false);
    });
  });

  describe('customPolicyResponseFailureEvaluator', () => {
    it('should return error when example output is invalid', () => {
      const invalidExample = {
        ...createMockExample([]),
        outputs: {
          insights: 'invalid',
        },
      } as Example;

      const result = evaluator(mockRun, invalidExample);

      expect(result).toEqual({
        key: 'correct',
        score: 0,
        comment: EVALUATOR_ERRORS.INVALID_OUTPUT_STRUCTURE,
      });
    });

    it('should return error when example is undefined', () => {
      const result = evaluator(mockRun, undefined);

      expect(result).toEqual({
        key: 'correct',
        score: 0,
        comment: EVALUATOR_ERRORS.INVALID_OUTPUT_STRUCTURE,
      });
    });

    it('should return error when run has no insights', () => {
      const runWithoutInsights = createMockRun([]);

      const result = evaluator(runWithoutInsights, mockExample);

      expect(result).toEqual({
        key: 'correct',
        score: 0,
        comment: EVALUATOR_ERRORS.NO_RESULTS,
      });
    });

    it('should return error when run outputs is undefined', () => {
      const runWithoutOutputs = {
        ...mockRun,
        outputs: undefined,
      };

      const result = evaluator(runWithoutOutputs, mockExample);

      expect(result).toEqual({
        key: 'correct',
        score: 0,
        comment: EVALUATOR_ERRORS.NO_RESULTS,
      });
    });

    it('should detect mismatch in number of insights', () => {
      const exampleWithMoreInsights = createMockExample([
        mockDefendInsight,
        { ...mockDefendInsight, group: 'different-group' },
      ]);

      const result = evaluator(mockRun, exampleWithMoreInsights);

      expect(result.score).toBe(0);
      expect(result.comment).toContain(
        'number of insight groups does not match number of requirements'
      );
      expect(result.comment).toContain('insights: 1');
      expect(result.comment).toContain('requirements: 2');
    });

    it('should detect missing insight group', () => {
      const exampleWithDifferentGroup = createMockExample([
        { ...mockDefendInsight, group: 'different-group' },
      ]);

      const result = evaluator(mockRun, exampleWithDifferentGroup);

      expect(result.score).toBe(0);
      expect(result.comment).toContain(
        'requirement "different-group" did not match any insight group'
      );
    });

    it('should detect mismatched links', () => {
      const runWithDifferentLink = createMockRun([
        {
          ...mockDefendInsight,
          remediation: {
            ...mockDefendInsight.remediation!,
            link: 'https://different-link.com',
          },
        },
      ]);

      const result = evaluator(runWithDifferentLink, mockExample);

      expect(result.score).toBe(0);
      expect(result.comment).toContain(
        'Links for requirement "policy-response-failure" is not matching'
      );
    });

    it('should detect mismatched number of events', () => {
      const runWithDifferentEvents = createMockRun([
        {
          ...mockDefendInsight,
          events: [mockDefendInsight.events![0]], // Only one event instead of two
        },
      ]);

      const result = evaluator(runWithDifferentEvents, mockExample);

      expect(result.score).toBe(0);
      expect(result.comment).toContain(
        'Number of events for requirement "policy-response-failure" is not matching'
      );
    });

    it('should detect missing event', () => {
      const runWithDifferentEventId = createMockRun([
        {
          ...mockDefendInsight,
          events: [
            { id: 'different-event', endpointId: 'endpoint1', value: 'value1' },
            mockDefendInsight.events![1],
          ],
        },
      ]);

      const result = evaluator(runWithDifferentEventId, mockExample);

      expect(result.score).toBe(0);
      expect(result.comment).toContain(
        'Event with id "different-event" for requirement "policy-response-failure" is not matching'
      );
    });

    it('should detect mismatched endpoint IDs', () => {
      const runWithDifferentEndpointId = createMockRun([
        {
          ...mockDefendInsight,
          events: [
            { ...mockDefendInsight.events![0], endpointId: 'different-endpoint' },
            mockDefendInsight.events![1],
          ],
        },
      ]);

      const result = evaluator(runWithDifferentEndpointId, mockExample);

      expect(result.score).toBe(0);
      expect(result.comment).toContain(
        'Event with id "event1" for requirement "policy-response-failure" has different endpoint IDs'
      );
    });

    it('should detect mismatched event values', () => {
      const runWithDifferentValue = createMockRun([
        {
          ...mockDefendInsight,
          events: [
            { ...mockDefendInsight.events![0], value: 'different-value' },
            mockDefendInsight.events![1],
          ],
        },
      ]);

      const result = evaluator(runWithDifferentValue, mockExample);

      expect(result.score).toBe(0);
      expect(result.comment).toContain(
        'Event with id "event1" for requirement "policy-response-failure" has different values'
      );
    });

    it('should return perfect score when everything matches exactly', () => {
      const result = evaluator(mockRun, mockExample);

      expect(result.key).toBe('correct');
      expect(result.score).toBe(1);
      expect(result.comment).toBe('All checks passed');
    });

    it('should calculate similarity score correctly for similar but not identical text', () => {
      const runWithSimilarMessage = createMockRun([
        {
          ...mockDefendInsight,
          remediation: {
            ...mockDefendInsight.remediation!,
            message: 'Different remediation message for policy response failure', // Different but some shared words
          },
        },
      ]);

      const result = evaluator(runWithSimilarMessage, mockExample);

      expect(result.key).toBe('correct');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(1);
      expect(result.comment).toBe('All checks passed');
    });

    it('should handle empty remediation messages', () => {
      const exampleWithEmptyMessage = createMockExample([
        {
          ...mockDefendInsight,
          remediation: {
            message: '',
            link: mockDefendInsight.remediation?.link, // Include the link to avoid link mismatch
          },
        },
      ]);

      const runWithEmptyMessage = createMockRun([
        {
          ...mockDefendInsight,
          remediation: {
            message: '',
            link: mockDefendInsight.remediation?.link, // Include the link to avoid link mismatch
          },
        },
      ]);

      const result = evaluator(runWithEmptyMessage, exampleWithEmptyMessage);

      expect(result.score).toBe(0); // Empty messages result in 0 similarity
      expect(result.comment).toBe('All checks passed');
    });

    it('should handle missing remediation objects', () => {
      // Create insights with undefined remediation - this should fail validation
      const insightWithoutRemediation = {
        group: 'test-group',
        events: [{ id: 'event1', endpointId: 'endpoint1', value: 'value1' }],
        remediation: undefined,
      };

      const exampleWithoutRemediation = createMockExample([insightWithoutRemediation]);
      const runWithoutRemediation = createMockRun([insightWithoutRemediation]);

      const result = evaluator(runWithoutRemediation, exampleWithoutRemediation);

      // Should fail validation because remediation.message is required to be a string
      expect(result.score).toBe(0);
      expect(result.comment).toBe(
        'Invalid output structure: expected {results: [{ name: string; requiredPaths: string[]; optionalPaths: string[]; excludedPaths: string[]; }]}'
      );
    });

    it('should handle empty events arrays', () => {
      const insightWithoutEvents = {
        ...mockDefendInsight,
        events: [],
      };

      const exampleWithoutEvents = createMockExample([insightWithoutEvents]);
      const runWithoutEvents = createMockRun([insightWithoutEvents]);

      const result = evaluator(runWithoutEvents, exampleWithoutEvents);

      expect(result.key).toBe('correct');
      expect(result.score).toBe(1); // Perfect match for identical messages
      expect(result.comment).toBe('All checks passed');
    });

    it('should handle multiple failed checks and format comment correctly', () => {
      const runWithMultipleIssues = createMockRun([
        {
          group: 'policy-response-failure',
          events: [{ id: 'wrong-event', endpointId: 'wrong-endpoint', value: 'wrong-value' }],
          remediation: {
            message: 'Completely different message',
            link: 'https://wrong-link.com',
          },
        },
      ]);

      const result = evaluator(runWithMultipleIssues, mockExample);

      expect(result.score).toBe(0);
      expect(result.comment).toContain('Failed checks:');
      expect(result.comment).toContain(
        'Links for requirement "policy-response-failure" is not matching'
      );
      expect(result.comment).toContain(
        'Number of events for requirement "policy-response-failure" is not matching'
      );
      expect(result.comment).toContain(
        'Event with id "wrong-event" for requirement "policy-response-failure" is not matching'
      );
    });
  });

  describe('similarity scoring', () => {
    it('should handle tokenization correctly in similarity calculation', () => {
      // Test with texts that share some meaningful words (>2 chars) after tokenization
      const text1 = 'Security policy response failure detected monitoring system';
      const text2 = 'Network security policy configuration detected system failure'; // Shares: security, policy, detected, system, failure

      const insight1: DefendInsight = {
        group: 'test',
        events: [{ id: 'event1', endpointId: 'endpoint1', value: 'value1' }],
        remediation: {
          message: text1,
          link: 'https://example.com/link', // Make sure link matches
        },
      };

      const insight2: DefendInsight = {
        group: 'test',
        events: [{ id: 'event1', endpointId: 'endpoint1', value: 'value1' }], // Same events
        remediation: {
          message: text2,
          link: 'https://example.com/link', // Same link
        },
      };

      const example = createMockExample([insight2]);
      const run = createMockRun([insight1]);

      const result = evaluator(run, example);

      expect(result.score).toBeGreaterThan(0); // Should have some similarity due to shared words
      expect(result.score).toBeLessThan(1); // But not perfect since messages are different
    });

    it('should handle very different texts with low similarity', () => {
      const insight1: DefendInsight = {
        group: 'test',
        events: [],
        remediation: { message: 'Policy response failure detected in system' },
      };

      const insight2: DefendInsight = {
        group: 'test',
        events: [],
        remediation: { message: 'Completely unrelated content about cats and dogs' },
      };

      const example = createMockExample([insight2]);
      const run = createMockRun([insight1]);

      const result = evaluator(run, example);

      expect(result.score).toBeLessThan(0.5); // Should have low similarity
    });

    it('should handle texts with only short words (filtered out)', () => {
      const insight1: DefendInsight = {
        group: 'test',
        events: [],
        remediation: { message: 'a an is to in on at' }, // All words <= 2 chars
      };

      const insight2: DefendInsight = {
        group: 'test',
        events: [],
        remediation: { message: 'it be we us or if do' }, // All words <= 2 chars
      };

      const example = createMockExample([insight2]);
      const run = createMockRun([insight1]);

      const result = evaluator(run, example);

      expect(result.score).toBe(0); // Should be 0 when no meaningful tokens
    });
  });
});
