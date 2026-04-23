/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { alertsSearchStepDefinition } from './alerts_search_step';
import type { AlertsSearchInput, AlertsSearchInputSchema } from '../../../common/workflows/steps';

const mockSearch = jest.fn();

const createMockContext = (
  input: AlertsSearchInput,
  spaceId = 'default'
): StepHandlerContext<typeof AlertsSearchInputSchema> =>
  ({
    input,
    config: {},
    rawInput: input,
    contextManager: {
      getScopedEsClient: () => ({ search: mockSearch }),
      getContext: () => ({
        workflow: { id: 'test-wf', name: 'Test', enabled: true, spaceId },
      }),
      renderInputTemplate: jest.fn((val) => val),
      getFakeRequest: jest.fn(),
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-step',
    stepType: 'security.alertsSearch',
  } as unknown as StepHandlerContext<typeof AlertsSearchInputSchema>);

describe('alertsSearchStepDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('has the correct step type id', () => {
      expect(alertsSearchStepDefinition.id).toBe('security.alertsSearch');
    });

    it('has input and output schemas defined', () => {
      expect(alertsSearchStepDefinition.inputSchema).toBeDefined();
      expect(alertsSearchStepDefinition.outputSchema).toBeDefined();
    });
  });

  describe('handler', () => {
    it('searches the correct default alerts index for the space', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: { total: { value: 5, relation: 'eq' }, hits: [] },
      });

      const context = createMockContext({}, 'my-space');
      const result = await alertsSearchStepDefinition.handler(context);

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.alerts-security.alerts-my-space',
          query: { match_all: {} },
          size: 0,
          ignore_unavailable: true,
          track_total_hits: true,
        })
      );
      expect(result).toEqual({ output: { total: 5, hits: [] } });
    });

    it('uses the default space when spaceId is not in context', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

      const context = createMockContext({});
      (context.contextManager.getContext as jest.Mock) = jest.fn(() => ({
        workflow: undefined,
      }));

      await alertsSearchStepDefinition.handler(context);

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.alerts-security.alerts-default',
        })
      );
    });

    it('uses a custom index when provided in input', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: { total: { value: 2, relation: 'eq' }, hits: [] },
      });

      const context = createMockContext({ index: '.custom-alerts-index' });
      await alertsSearchStepDefinition.handler(context);

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ index: '.custom-alerts-index' })
      );
    });

    it('passes query, size, and sort to the ES search', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: {
          total: { value: 3, relation: 'eq' },
          hits: [
            { _source: { 'kibana.alert.severity': 'critical' } },
            { _source: { 'kibana.alert.severity': 'critical' } },
            { _source: { 'kibana.alert.severity': 'critical' } },
          ],
        },
      });

      const input: AlertsSearchInput = {
        query: { bool: { filter: [{ term: { 'kibana.alert.severity': 'critical' } }] } },
        size: 10,
        sort: [{ '@timestamp': { order: 'desc' } }],
      };

      const context = createMockContext(input);
      const result = await alertsSearchStepDefinition.handler(context);

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: input.query,
          size: 10,
          sort: input.sort,
        })
      );
      expect(result.output?.total).toBe(3);
      expect(result.output?.hits).toHaveLength(3);
    });

    it('defaults size to 0 when not provided', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: { total: { value: 42, relation: 'eq' }, hits: [] },
      });

      const context = createMockContext({ query: { match_all: {} } });
      const result = await alertsSearchStepDefinition.handler(context);

      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ size: 0 }));
      expect(result.output?.total).toBe(42);
      expect(result.output?.hits).toEqual([]);
    });

    it('handles total as a plain number (legacy response shape)', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: { total: 7, hits: [] },
      });

      const context = createMockContext({});
      const result = await alertsSearchStepDefinition.handler(context);

      expect(result.output?.total).toBe(7);
    });

    it('extracts _source from hits, falling back to empty object', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: {
          total: { value: 2, relation: 'eq' },
          hits: [{ _source: { field: 'value' } }, {}],
        },
      });

      const context = createMockContext({ size: 10 });
      const result = await alertsSearchStepDefinition.handler(context);

      expect(result.output?.hits).toEqual([{ field: 'value' }, {}]);
    });

    it('returns an error when ES search fails', async () => {
      mockSearch.mockRejectedValueOnce(new Error('index_not_found_exception'));

      const context = createMockContext({});
      const result = await alertsSearchStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('index_not_found_exception');
      expect(result.output).toBeUndefined();
    });

    it('handles non-Error thrown values', async () => {
      mockSearch.mockRejectedValueOnce('unexpected string error');

      const context = createMockContext({});
      const result = await alertsSearchStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Failed to search security alerts');
    });
  });
});
