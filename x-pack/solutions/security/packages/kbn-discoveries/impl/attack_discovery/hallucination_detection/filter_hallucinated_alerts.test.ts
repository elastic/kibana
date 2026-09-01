/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { estypes } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import { filterHallucinatedAlerts } from './filter_hallucinated_alerts';
import type { DiscoveryWithAlertIds } from './types';

const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
const mockLogger = loggerMock.create();

describe('filterHallucinatedAlerts', () => {
  const alertsIndexPattern = '.alerts-security.alerts-*';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDiscovery1: DiscoveryWithAlertIds = {
    alertIds: ['alert-1', 'alert-2'],
    title: 'Discovery 1',
  };

  const mockDiscovery2: DiscoveryWithAlertIds = {
    alertIds: ['alert-3'],
    title: 'Discovery 2',
  };

  const mockDiscovery3: DiscoveryWithAlertIds = {
    alertIds: ['alert-4', 'alert-5'],
    title: 'Discovery 3',
  };

  const mockDiscoveryWithSnakeCase: DiscoveryWithAlertIds = {
    alert_ids: ['alert-6', 'alert-7'],
    title: 'Discovery with snake_case',
  };

  const defaultProps = {
    alertsIndexPattern,
    attackDiscoveries: [mockDiscovery1, mockDiscovery2, mockDiscovery3],
    esClient: mockEsClient,
    logger: mockLogger,
  };

  // Helper to extract the actual message from a lazy-evaluated logger call
  const getInfoMessage = (): string => {
    const infoCall = mockLogger.info.mock.calls[0]?.[0];
    return typeof infoCall === 'function' ? infoCall() : infoCall;
  };

  const getDebugMessage = (callIndex: number = 0): string => {
    const debugCall = mockLogger.debug.mock.calls[callIndex]?.[0];
    return typeof debugCall === 'function' ? debugCall() : debugCall;
  };

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
    beforeEach(() => {
      mockEsClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 5, relation: 'eq' },
          max_score: 1.0,
          hits: [
            { _id: 'alert-1' },
            { _id: 'alert-2' },
            { _id: 'alert-3' },
            { _id: 'alert-4' },
            { _id: 'alert-5' },
          ],
        },
      } as estypes.SearchResponse);
    });

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
          size: 5, // unique alert IDs
        })
      );
    });

    it('queries ES with the ids query containing all unique alert IDs', async () => {
      await filterHallucinatedAlerts(defaultProps);

      const searchCall = mockEsClient.search.mock.calls[0][0] as estypes.SearchRequest;
      expect(searchCall.query).toEqual({
        ids: {
          values: expect.arrayContaining(['alert-1', 'alert-2', 'alert-3', 'alert-4', 'alert-5']),
        },
      });
    });

    it('deduplicates alert IDs before querying', async () => {
      const discoveryWithDuplicates: DiscoveryWithAlertIds = {
        alertIds: ['alert-1', 'alert-1', 'alert-2'],
        title: 'Discovery with duplicates',
      };

      await filterHallucinatedAlerts({
        ...defaultProps,
        attackDiscoveries: [discoveryWithDuplicates],
      });

      const searchCall = mockEsClient.search.mock.calls[0][0] as estypes.SearchRequest;
      const idsQuery = searchCall.query as { ids?: { values?: string[] } };
      const values = idsQuery.ids?.values;
      expect(values).toHaveLength(2);
      expect(values).toEqual(expect.arrayContaining(['alert-1', 'alert-2']));
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
      mockEsClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 3, relation: 'eq' },
          max_score: 1.0,
          hits: [{ _id: 'alert-1' }, { _id: 'alert-2' }, { _id: 'alert-3' }],
        },
      } as estypes.SearchResponse);
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

    it('logs debug message for filtered discovery', async () => {
      await filterHallucinatedAlerts(defaultProps);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(getDebugMessage()).toContain('Discovery 3');
    });
  });

  describe('when a discovery has a partially missing alert ID', () => {
    beforeEach(() => {
      mockEsClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 4, relation: 'eq' },
          max_score: 1.0,
          hits: [{ _id: 'alert-1' }, { _id: 'alert-2' }, { _id: 'alert-4' }, { _id: 'alert-5' }],
        },
      } as estypes.SearchResponse);
    });

    it('filters out the discovery with the missing alert ID', async () => {
      const result = await filterHallucinatedAlerts(defaultProps);

      expect(result).toEqual([mockDiscovery1, mockDiscovery3]);
    });

    it('excludes the discovery from results', async () => {
      const result = await filterHallucinatedAlerts(defaultProps);

      expect(result).not.toContain(mockDiscovery2);
    });

    it('logs discovery title in debug message', async () => {
      await filterHallucinatedAlerts(defaultProps);

      expect(getDebugMessage()).toContain('Discovery 2');
    });

    it('logs hallucinated alert ID in debug message', async () => {
      await filterHallucinatedAlerts(defaultProps);

      expect(getDebugMessage()).toContain('alert-3');
    });
  });

  describe('when multiple discoveries have hallucinated alert IDs', () => {
    beforeEach(() => {
      mockEsClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 1.0,
          hits: [{ _id: 'alert-2' }],
        },
      } as estypes.SearchResponse);
    });

    it('logs information about filtered discoveries', async () => {
      await filterHallucinatedAlerts(defaultProps);

      expect(getInfoMessage()).toBe(
        'Attack discovery: Filtered out 3 discovery(ies) with hallucinated alert IDs'
      );
    });
  });

  describe('when all discoveries have hallucinated alert IDs', () => {
    beforeEach(() => {
      mockEsClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 0, relation: 'eq' },
          max_score: null,
          hits: [],
        },
      } as estypes.SearchResponse);
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

  describe('when discoveries have empty alertIds', () => {
    const mockDiscoveryEmpty: DiscoveryWithAlertIds = {
      alertIds: [],
      title: 'Empty Discovery',
    };

    beforeEach(() => {
      mockEsClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 2, relation: 'eq' },
          max_score: 1.0,
          hits: [{ _id: 'alert-1' }, { _id: 'alert-2' }],
        },
      } as estypes.SearchResponse);
    });

    it('filters out discoveries with empty alertIds', async () => {
      const result = await filterHallucinatedAlerts({
        ...defaultProps,
        attackDiscoveries: [mockDiscovery1, mockDiscoveryEmpty],
      });

      expect(result).toEqual([mockDiscovery1]);
    });

    it('logs unverifiable discoveries', async () => {
      await filterHallucinatedAlerts({
        ...defaultProps,
        attackDiscoveries: [mockDiscovery1, mockDiscoveryEmpty],
      });

      expect(getInfoMessage()).toContain('empty alertIds');
    });
  });

  describe('when using snake_case alert_ids field', () => {
    beforeEach(() => {
      mockEsClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 2, relation: 'eq' },
          max_score: 1.0,
          hits: [{ _id: 'alert-6' }, { _id: 'alert-7' }],
        },
      } as estypes.SearchResponse);
    });

    it('returns discoveries with snake_case alert_ids', async () => {
      const result = await filterHallucinatedAlerts({
        ...defaultProps,
        attackDiscoveries: [mockDiscoveryWithSnakeCase],
      });

      expect(result).toEqual([mockDiscoveryWithSnakeCase]);
    });

    it('queries ES with snake_case alert IDs', async () => {
      await filterHallucinatedAlerts({
        ...defaultProps,
        attackDiscoveries: [mockDiscoveryWithSnakeCase],
      });

      const searchCall = mockEsClient.search.mock.calls[0][0] as estypes.SearchRequest;
      expect(searchCall.query).toEqual({
        ids: {
          values: expect.arrayContaining(['alert-6', 'alert-7']),
        },
      });
    });
  });

  describe('when ES returns null _id values', () => {
    beforeEach(() => {
      mockEsClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 4, relation: 'eq' },
          max_score: 1.0,
          hits: [{ _id: 'alert-1' }, { _id: null }, { _id: 'alert-2' }, { _id: undefined }],
        },
      } as unknown as estypes.SearchResponse);
    });

    it('filters out null/undefined _id values', async () => {
      const result = await filterHallucinatedAlerts(defaultProps);

      expect(result).toEqual([mockDiscovery1]);
    });
  });
});
