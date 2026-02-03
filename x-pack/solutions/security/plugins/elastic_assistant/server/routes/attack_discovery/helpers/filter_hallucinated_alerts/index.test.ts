/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { loggerMock } from '@kbn/logging-mocks';

import { filterHallucinatedAlerts } from '.';

const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
const mockLogger = loggerMock.create();

describe('filterHallucinatedAlerts', () => {
  const alertsIndexPattern = '.alerts-security.alerts-*';

  // Helper to extract the actual message from a lazy-evaluated logger call
  const getInfoMessage = () => {
    const call = mockLogger.info.mock.calls[0][0];
    return typeof call === 'function' ? call() : call;
  };

  const getDebugMessage = (callIndex: number = 0) => {
    const call = mockLogger.debug.mock.calls[callIndex][0];
    return typeof call === 'function' ? call() : call;
  };

  const mockDiscovery1: AttackDiscovery = {
    alertIds: ['alert-1', 'alert-2', 'alert-3'],
    detailsMarkdown: 'Details 1',
    summaryMarkdown: 'Summary 1',
    timestamp: '2024-01-01T00:00:00.000Z',
    title: 'Discovery 1',
  };

  const mockDiscovery2: AttackDiscovery = {
    alertIds: ['alert-4', 'alert-5'],
    detailsMarkdown: 'Details 2',
    summaryMarkdown: 'Summary 2',
    timestamp: '2024-01-02T00:00:00.000Z',
    title: 'Discovery 2',
  };

  const mockDiscovery3: AttackDiscovery = {
    alertIds: ['alert-6', 'alert-7', 'alert-8'],
    detailsMarkdown: 'Details 3',
    summaryMarkdown: 'Summary 3',
    timestamp: '2024-01-03T00:00:00.000Z',
    title: 'Discovery 3',
  };

  const defaultProps = {
    alertsIndexPattern,
    attackDiscoveries: [mockDiscovery1, mockDiscovery2, mockDiscovery3],
    esClient: mockEsClient,
    logger: mockLogger,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: all alerts exist
    mockEsClient.search.mockResponse({
      hits: {
        hits: [
          { _id: 'alert-1' },
          { _id: 'alert-2' },
          { _id: 'alert-3' },
          { _id: 'alert-4' },
          { _id: 'alert-5' },
          { _id: 'alert-6' },
          { _id: 'alert-7' },
          { _id: 'alert-8' },
        ],
      },
    } as unknown as estypes.SearchResponse);
  });

  describe('when no discoveries are provided', () => {
    it('returns an empty array', async () => {
      const result = await filterHallucinatedAlerts({
        ...defaultProps,
        attackDiscoveries: [],
      });

      expect(result).toEqual([]);
    });

    it('does NOT call ES when no discoveries are generated', async () => {
      await filterHallucinatedAlerts({
        ...defaultProps,
        attackDiscoveries: [],
      });

      expect(mockEsClient.search).not.toHaveBeenCalled();
    });
  });

  describe('when all alert IDs exist', () => {
    it('returns all discoveries', async () => {
      const result = await filterHallucinatedAlerts(defaultProps);

      expect(result).toEqual([mockDiscovery1, mockDiscovery2, mockDiscovery3]);
    });

    it('does NOT log when no discoveries are filtered', async () => {
      await filterHallucinatedAlerts(defaultProps);

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('queries ES with the correct index pattern', async () => {
      await filterHallucinatedAlerts(defaultProps);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: alertsIndexPattern,
        })
      );
    });

    it('queries ES with the correct size', async () => {
      await filterHallucinatedAlerts(defaultProps);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 8,
        })
      );
    });

    it('queries ES with the ids query containing all unique alert IDs', async () => {
      await filterHallucinatedAlerts(defaultProps);

      const searchCall = mockEsClient.search.mock.calls[0][0] as estypes.SearchRequest;
      expect(searchCall.query).toEqual({
        ids: {
          values: expect.arrayContaining([
            'alert-1',
            'alert-2',
            'alert-3',
            'alert-4',
            'alert-5',
            'alert-6',
            'alert-7',
            'alert-8',
          ]),
        },
      });
    });

    it('queries ES with _source set to false', async () => {
      await filterHallucinatedAlerts(defaultProps);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          _source: false,
        })
      );
    });

    it('queries ES with ignore_unavailable set to true', async () => {
      await filterHallucinatedAlerts(defaultProps);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          ignore_unavailable: true,
        })
      );
    });
  });

  describe('when some alert IDs do not exist', () => {
    beforeEach(() => {
      // Only alerts 1, 2, 3, 4, 5 exist (discovery 3's alerts are missing)
      mockEsClient.search.mockResponse({
        hits: {
          hits: [
            { _id: 'alert-1' },
            { _id: 'alert-2' },
            { _id: 'alert-3' },
            { _id: 'alert-4' },
            { _id: 'alert-5' },
            // alert-6, alert-7, alert-8 are missing
          ],
        },
      } as unknown as estypes.SearchResponse);
    });

    it('returns only discoveries with all alert IDs present', async () => {
      const result = await filterHallucinatedAlerts(defaultProps);

      expect(result).toEqual([mockDiscovery1, mockDiscovery2]);
    });

    it('excludes discoveries with missing alert IDs', async () => {
      const result = await filterHallucinatedAlerts(defaultProps);

      expect(result).not.toContain(mockDiscovery3);
    });

    it('logs info message with count of filtered discoveries', async () => {
      await filterHallucinatedAlerts(defaultProps);

      expect(getInfoMessage()).toBe(
        'Attack discovery: Filtered out 1 discovery(ies) with hallucinated alert IDs'
      );
    });
  });

  describe('when only one alert ID is missing from a discovery', () => {
    beforeEach(() => {
      // alert-3 is missing from discovery 1
      mockEsClient.search.mockResponse({
        hits: {
          hits: [
            { _id: 'alert-1' },
            { _id: 'alert-2' },
            // alert-3 is missing
            { _id: 'alert-4' },
            { _id: 'alert-5' },
            { _id: 'alert-6' },
            { _id: 'alert-7' },
            { _id: 'alert-8' },
          ],
        },
      } as unknown as estypes.SearchResponse);
    });

    it('filters out the discovery with the missing alert ID', async () => {
      const result = await filterHallucinatedAlerts(defaultProps);

      expect(result).toEqual([mockDiscovery2, mockDiscovery3]);
    });

    it('excludes the discovery from results', async () => {
      const result = await filterHallucinatedAlerts(defaultProps);

      expect(result).not.toContain(mockDiscovery1);
    });

    it('logs discovery title in debug message', async () => {
      await filterHallucinatedAlerts(defaultProps);

      expect(getDebugMessage()).toContain('Discovery 1');
    });

    it('logs hallucinated alert ID in debug message', async () => {
      await filterHallucinatedAlerts(defaultProps);

      expect(getDebugMessage()).toContain('alert-3');
    });
  });

  describe('when multiple discoveries have missing alert IDs', () => {
    beforeEach(() => {
      mockEsClient.search.mockResponse({
        hits: {
          hits: [
            { _id: 'alert-1' },
            { _id: 'alert-2' },
            { _id: 'alert-3' },
            // alert-4, alert-5 missing (discovery 2)
            // alert-6, alert-7, alert-8 missing (discovery 3)
          ],
        },
      } as unknown as estypes.SearchResponse);
    });

    it('logs information about filtered discoveries', async () => {
      await filterHallucinatedAlerts(defaultProps);

      expect(getInfoMessage()).toBe(
        'Attack discovery: Filtered out 2 discovery(ies) with hallucinated alert IDs'
      );
    });
  });

  describe('when all alert IDs are hallucinated', () => {
    beforeEach(() => {
      mockEsClient.search.mockResponse({
        hits: {
          hits: [],
        },
      } as unknown as estypes.SearchResponse);
    });

    it('returns empty array', async () => {
      const result = await filterHallucinatedAlerts(defaultProps);

      expect(result).toEqual([]);
    });

    it('logs that all discoveries were filtered', async () => {
      await filterHallucinatedAlerts(defaultProps);

      expect(getInfoMessage()).toBe(
        'Attack discovery: Filtered out 3 discovery(ies) with hallucinated alert IDs'
      );
    });
  });

  describe('deduplication optimization', () => {
    describe('with duplicate alert IDs in a single discovery', () => {
      const discoveryWithDuplicates: AttackDiscovery = {
        alertIds: ['alert-1', 'alert-1', 'alert-2', 'alert-2', 'alert-3'],
        detailsMarkdown: 'Details',
        summaryMarkdown: 'Summary',
        timestamp: '2024-01-01T00:00:00.000Z',
        title: 'Discovery with duplicates',
      };

      it('queries ES with deduplicated alert IDs', async () => {
        await filterHallucinatedAlerts({
          ...defaultProps,
          attackDiscoveries: [discoveryWithDuplicates],
        });

        const searchCall = mockEsClient.search.mock.calls[0][0] as estypes.SearchRequest;
        const queryValues = (searchCall.query as { ids: { values: string[] } }).ids.values;

        expect(queryValues).toHaveLength(3);
      });

      it('ensures all query values are unique', async () => {
        await filterHallucinatedAlerts({
          ...defaultProps,
          attackDiscoveries: [discoveryWithDuplicates],
        });

        const searchCall = mockEsClient.search.mock.calls[0][0] as estypes.SearchRequest;
        const queryValues = (searchCall.query as { ids: { values: string[] } }).ids.values;

        expect(new Set(queryValues).size).toBe(3);
      });
    });

    describe('with duplicate alert IDs across multiple discoveries', () => {
      const discovery1: AttackDiscovery = {
        alertIds: ['alert-1', 'alert-2'],
        detailsMarkdown: 'Details 1',
        summaryMarkdown: 'Summary 1',
        timestamp: '2024-01-01T00:00:00.000Z',
        title: 'Discovery 1',
      };

      const discovery2: AttackDiscovery = {
        alertIds: ['alert-2', 'alert-3'],
        detailsMarkdown: 'Details 2',
        summaryMarkdown: 'Summary 2',
        timestamp: '2024-01-02T00:00:00.000Z',
        title: 'Discovery 2',
      };

      it('deduplicates alert IDs across discoveries', async () => {
        await filterHallucinatedAlerts({
          ...defaultProps,
          attackDiscoveries: [discovery1, discovery2],
        });

        const searchCall = mockEsClient.search.mock.calls[0][0] as estypes.SearchRequest;
        const queryValues = (searchCall.query as { ids: { values: string[] } }).ids.values;

        expect(queryValues).toHaveLength(3);
      });

      it('ensures all query values are unique', async () => {
        await filterHallucinatedAlerts({
          ...defaultProps,
          attackDiscoveries: [discovery1, discovery2],
        });

        const searchCall = mockEsClient.search.mock.calls[0][0] as estypes.SearchRequest;
        const queryValues = (searchCall.query as { ids: { values: string[] } }).ids.values;

        expect(new Set(queryValues).size).toBe(3);
      });
    });
  });

  describe('error handling', () => {
    it('throws error when ES query fails', async () => {
      const error = new Error('ES query failed');
      mockEsClient.search.mockRejectedValue(error);

      await expect(filterHallucinatedAlerts(defaultProps)).rejects.toThrow('ES query failed');
    });
  });

  describe('edge cases', () => {
    describe('when some discoveries have empty alertIds', () => {
      const discoveryWithNoAlerts: AttackDiscovery = {
        alertIds: [],
        detailsMarkdown: 'Details',
        summaryMarkdown: 'Summary',
        timestamp: '2024-01-01T00:00:00.000Z',
        title: 'Discovery with no alerts',
      };

      it('filters out discoveries with empty alertIds arrays', async () => {
        const result = await filterHallucinatedAlerts({
          ...defaultProps,
          attackDiscoveries: [discoveryWithNoAlerts, mockDiscovery1],
        });

        expect(result).toEqual([mockDiscovery1]);
      });

      it('still includes the alertIds from NON-empty discoveries in the ES query', async () => {
        await filterHallucinatedAlerts({
          ...defaultProps,
          attackDiscoveries: [discoveryWithNoAlerts, mockDiscovery1],
        });

        const searchCall = mockEsClient.search.mock.calls[0][0] as estypes.SearchRequest;
        const queryValues = (searchCall.query as { ids: { values: string[] } }).ids.values;

        expect(queryValues).toEqual(expect.arrayContaining(['alert-1', 'alert-2', 'alert-3']));
      });

      it('logs the expected info message about filtered empty discoveries', async () => {
        await filterHallucinatedAlerts({
          ...defaultProps,
          attackDiscoveries: [discoveryWithNoAlerts, mockDiscovery1],
        });

        expect(getInfoMessage()).toBe(
          'Attack discovery: Filtered out 1 hallucinated discovery(ies) with empty alertIds'
        );
      });

      it('logs the expected debug message that includes the discovery title', async () => {
        await filterHallucinatedAlerts({
          ...defaultProps,
          attackDiscoveries: [discoveryWithNoAlerts, mockDiscovery1],
        });

        expect(getDebugMessage()).toContain('Discovery with no alerts');
      });

      it('logs a debug message mentioning empty alertIds', async () => {
        await filterHallucinatedAlerts({
          ...defaultProps,
          attackDiscoveries: [discoveryWithNoAlerts, mockDiscovery1],
        });

        expect(getDebugMessage()).toContain('empty alertIds');
      });
    });

    describe('when all discoveries have empty alertIds', () => {
      const discoveryWithNoAlerts1: AttackDiscovery = {
        alertIds: [],
        detailsMarkdown: 'Details 1',
        summaryMarkdown: 'Summary 1',
        timestamp: '2024-01-01T00:00:00.000Z',
        title: 'Discovery 1 with no alerts',
      };

      const discoveryWithNoAlerts2: AttackDiscovery = {
        alertIds: [],
        detailsMarkdown: 'Details 2',
        summaryMarkdown: 'Summary 2',
        timestamp: '2024-01-02T00:00:00.000Z',
        title: 'Discovery 2 with no alerts',
      };

      it('returns an empty array', async () => {
        const result = await filterHallucinatedAlerts({
          ...defaultProps,
          attackDiscoveries: [discoveryWithNoAlerts1, discoveryWithNoAlerts2],
        });

        expect(result).toEqual([]);
      });

      it('does NOT query ES', async () => {
        await filterHallucinatedAlerts({
          ...defaultProps,
          attackDiscoveries: [discoveryWithNoAlerts1, discoveryWithNoAlerts2],
        });

        expect(mockEsClient.search).not.toHaveBeenCalled();
      });

      it('logs info message about all discoveries being filtered', async () => {
        await filterHallucinatedAlerts({
          ...defaultProps,
          attackDiscoveries: [discoveryWithNoAlerts1, discoveryWithNoAlerts2],
        });

        expect(getInfoMessage()).toBe(
          'Attack discovery: Filtered out 2 hallucinated discovery(ies) with empty alertIds'
        );
      });

      it('logs a debug message for the first discovery', async () => {
        await filterHallucinatedAlerts({
          ...defaultProps,
          attackDiscoveries: [discoveryWithNoAlerts1, discoveryWithNoAlerts2],
        });

        expect(getDebugMessage(0)).toContain('Discovery 1 with no alerts');
      });

      it('logs a debug message for the second discovery', async () => {
        await filterHallucinatedAlerts({
          ...defaultProps,
          attackDiscoveries: [discoveryWithNoAlerts1, discoveryWithNoAlerts2],
        });

        expect(getDebugMessage(1)).toContain('Discovery 2 with no alerts');
      });
    });
  });
});
