/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { getCorrelateEntitiesStepDefinition } from './get_correlate_entities_step_definition';
import { authenticateAndGetSpace } from '../default_validation_step/helpers/authenticate_and_get_space';

jest.mock('../default_validation_step/helpers/authenticate_and_get_space', () => ({
  authenticateAndGetSpace: jest.fn(),
}));

const mockAuthenticateAndGetSpace = authenticateAndGetSpace as jest.MockedFunction<
  typeof authenticateAndGetSpace
>;

describe('getCorrelateEntitiesStepDefinition', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const mockSearch = jest.fn();
  const mockEsClient = { search: mockSearch };

  const mockListEntities = jest.fn();
  const mockCreateCRUDClient = jest.fn().mockReturnValue({ listEntities: mockListEntities });

  const mockGetBooleanValue = jest.fn();

  const mockGetStartServices = jest.fn();

  const discovery = {
    alert_ids: ['alert-1', 'alert-2'],
    details_markdown: 'Details',
    id: 'discovery-1',
    summary_markdown: 'Summary',
    title: 'Test Discovery',
  };

  const mockContext = {
    abortSignal: undefined,
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue({ headers: {} }),
    },
    input: {
      attack_discoveries: [discovery],
    },
    logger: {
      error: jest.fn(),
      info: jest.fn(),
    },
  };

  const searchResponseWithCandidates = {
    aggregations: {
      unique_users_by_euid: {
        buckets: [
          {
            key: 'user:jdoe',
            doc_count: 2,
            sample: {
              hits: {
                hits: [
                  {
                    // host.id gives the local user identity enough context to
                    // pass the EUID pipeline gate (mirrors real alert docs):
                    _source: {
                      host: { id: 'host-1' },
                      source: { ip: '10.0.0.1' },
                      user: { name: 'jdoe' },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
      unique_hosts_by_euid: {
        buckets: [
          {
            key: 'host:web-01',
            doc_count: 2,
            sample: { hits: { hits: [{ _source: { host: { name: 'web-01' } } }] } },
          },
        ],
      },
    },
  };

  const getStepDefinition = () =>
    getCorrelateEntitiesStepDefinition({
      getStartServices: mockGetStartServices,
      logger: mockLogger,
    });

  const getOutputOrThrow = <T>(result: { output?: T }): T => {
    if (!result.output) {
      throw new Error('Expected result.output to be defined');
    }

    return result.output;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetBooleanValue.mockResolvedValue(true);
    mockGetStartServices.mockResolvedValue({
      coreStart: { featureFlags: { getBooleanValue: mockGetBooleanValue } },
      pluginsStart: { entityStore: { createCRUDClient: mockCreateCRUDClient } },
    });

    mockAuthenticateAndGetSpace.mockResolvedValue({
      authenticationInfo: {},
      authenticatedUser: { username: 'test-user' },
      esClient: mockEsClient,
      spaceId: 'default',
    } as unknown as Awaited<ReturnType<typeof authenticateAndGetSpace>>);

    mockSearch.mockResolvedValue(searchResponseWithCandidates);
    mockListEntities.mockResolvedValue({ entities: [{ entity: { id: 'user:jdoe' } }] });
  });

  describe('step definition metadata', () => {
    it('has the correct id', () => {
      expect(getStepDefinition().id).toBe('security.attack-discovery.correlateEntities');
    });
  });

  describe('when the feature flag is disabled', () => {
    beforeEach(() => {
      mockGetBooleanValue.mockResolvedValue(false);
    });

    it('passes discoveries through unmodified', async () => {
      const result = await getStepDefinition().handler(mockContext as never);

      expect(getOutputOrThrow(result)).toEqual({
        correlated_discoveries: [discovery],
        entities_matched_count: 0,
        observable_entities_count: 0,
      });
    });

    it('does not query the alerts index', async () => {
      await getStepDefinition().handler(mockContext as never);

      expect(mockSearch).not.toHaveBeenCalled();
    });
  });

  describe('when correlation succeeds', () => {
    it('attaches matched EUIDs as entities (stored as-is)', async () => {
      const result = await getStepDefinition().handler(mockContext as never);
      const output = getOutputOrThrow(result);
      const [correlated] = output.correlated_discoveries as Array<Record<string, unknown>>;

      expect(correlated.entities).toEqual([{ id: 'user:jdoe', type: 'user' }]);
    });

    it('attaches unmatched values and extracted observables as observable_entities', async () => {
      const result = await getStepDefinition().handler(mockContext as never);
      const output = getOutputOrThrow(result);
      const [correlated] = output.correlated_discoveries as Array<Record<string, unknown>>;

      expect(correlated.observable_entities).toEqual(
        expect.arrayContaining([
          { type_key: 'observable-type-hostname', value: 'web-01' },
          { type_key: 'observable-type-ipv4', value: '10.0.0.1' },
        ])
      );
    });

    it('does not re-report the matched user as an observable', async () => {
      const result = await getStepDefinition().handler(mockContext as never);
      const output = getOutputOrThrow(result);
      const [correlated] = output.correlated_discoveries as Array<Record<string, unknown>>;

      expect(correlated.observable_entities).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ value: 'jdoe' })])
      );
    });

    it('preserves the original discovery fields', async () => {
      const result = await getStepDefinition().handler(mockContext as never);
      const output = getOutputOrThrow(result);
      const [correlated] = output.correlated_discoveries as Array<Record<string, unknown>>;

      expect(correlated).toEqual(expect.objectContaining(discovery));
    });

    it('reports the match counts', async () => {
      const result = await getStepDefinition().handler(mockContext as never);
      const output = getOutputOrThrow(result);

      expect(output.entities_matched_count).toBe(1);
      expect(output.observable_entities_count).toBeGreaterThanOrEqual(2);
    });

    it('queries the space-scoped alerts index by default', async () => {
      await getStepDefinition().handler(mockContext as never);

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ index: '.alerts-security.alerts-default' }),
        expect.anything()
      );
    });

    it('honors a provided alerts_index_pattern', async () => {
      const contextWithIndex = {
        ...mockContext,
        input: { ...mockContext.input, alerts_index_pattern: '.alerts-custom' },
      };

      await getStepDefinition().handler(contextWithIndex as never);

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ index: '.alerts-custom' }),
        expect.anything()
      );
    });

    it('creates the Entity Store CRUD client for the resolved space', async () => {
      await getStepDefinition().handler(mockContext as never);

      expect(mockCreateCRUDClient).toHaveBeenCalledWith(mockEsClient, 'default');
    });

    it('de-obfuscates anonymized alert ids via the discovery replacements before querying', async () => {
      const anonymizedDiscovery = {
        ...discovery,
        alert_ids: ['uuid-1'],
        replacements: { 'uuid-1': 'real-alert-1' },
      };
      const contextWithReplacements = {
        ...mockContext,
        input: { attack_discoveries: [anonymizedDiscovery] },
      };

      await getStepDefinition().handler(contextWithReplacements as never);

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ query: { ids: { values: ['real-alert-1'] } } }),
        expect.anything()
      );
    });
  });

  describe('when the entity store plugin is unavailable', () => {
    beforeEach(() => {
      mockGetStartServices.mockResolvedValue({
        coreStart: { featureFlags: { getBooleanValue: mockGetBooleanValue } },
        pluginsStart: {},
      });
    });

    it('classifies every candidate as an observable entity', async () => {
      const result = await getStepDefinition().handler(mockContext as never);
      const output = getOutputOrThrow(result);
      const [correlated] = output.correlated_discoveries as Array<Record<string, unknown>>;

      expect(correlated.entities).toEqual([]);
      expect(correlated.observable_entities).toEqual(
        expect.arrayContaining([
          { type_key: 'observable-type-user-name', value: 'jdoe' },
          { type_key: 'observable-type-hostname', value: 'web-01' },
        ])
      );
    });
  });

  describe('degradation', () => {
    it('returns a discovery unmodified when its alerts query fails, but still enriches the others', async () => {
      const otherDiscovery = { ...discovery, alert_ids: ['alert-3'], id: 'discovery-2' };
      const contextWithTwo = {
        ...mockContext,
        input: { attack_discoveries: [discovery, otherDiscovery] },
      };

      mockSearch
        .mockRejectedValueOnce(new Error('search failed'))
        .mockResolvedValueOnce(searchResponseWithCandidates);

      const result = await getStepDefinition().handler(contextWithTwo as never);
      const output = getOutputOrThrow(result);
      const correlated = output.correlated_discoveries as Array<Record<string, unknown>>;

      expect(correlated[0]).toEqual(discovery);
      expect(correlated[1].entities).toEqual([{ id: 'user:jdoe', type: 'user' }]);
    });

    it('passes all discoveries through unmodified when authentication fails (never throws)', async () => {
      mockAuthenticateAndGetSpace.mockRejectedValue(new Error('auth failed'));

      const result = await getStepDefinition().handler(mockContext as never);

      expect(getOutputOrThrow(result)).toEqual({
        correlated_discoveries: [discovery],
        entities_matched_count: 0,
        observable_entities_count: 0,
      });
      expect(result).not.toHaveProperty('error');
    });

    it('logs the failure to the context logger on overall errors', async () => {
      mockAuthenticateAndGetSpace.mockRejectedValue(new Error('auth failed'));

      await getStepDefinition().handler(mockContext as never);

      expect(mockContext.logger.error).toHaveBeenCalledWith(
        'Failed to correlate entities; passing discoveries through unmodified',
        expect.any(Error)
      );
    });

    it('returns discoveries without alert ids unmodified', async () => {
      const noAlertIdsDiscovery = { ...discovery, alert_ids: [] };
      const contextWithout = {
        ...mockContext,
        input: { attack_discoveries: [noAlertIdsDiscovery] },
      };

      const result = await getStepDefinition().handler(contextWithout as never);
      const output = getOutputOrThrow(result);

      expect(output.correlated_discoveries).toEqual([noAlertIdsDiscovery]);
      expect(mockSearch).not.toHaveBeenCalled();
    });
  });

  describe('when no discoveries are provided', () => {
    it('returns an empty passthrough output without authenticating', async () => {
      const emptyContext = { ...mockContext, input: { attack_discoveries: [] } };

      const result = await getStepDefinition().handler(emptyContext as never);

      expect(getOutputOrThrow(result)).toEqual({
        correlated_discoveries: [],
        entities_matched_count: 0,
        observable_entities_count: 0,
      });
      expect(mockAuthenticateAndGetSpace).not.toHaveBeenCalled();
    });
  });
});
