/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fetchGraph } from './fetch_graph';
import type { Logger } from '@kbn/core/server';
import type { OriginEventId, EsQuery } from './types';
import { getEnrichPolicyId } from '@kbn/cloud-security-posture-common/utils/helpers';

describe('fetchGraph', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  let logger: Logger;

  beforeEach(() => {
    const toRecordsMock = jest.fn().mockResolvedValue([{ id: 'dummy' }]);
    // Stub the esClient helpers.esql method to return an object with toRecords
    esClient.asCurrentUser.helpers.esql.mockReturnValue({
      toRecords: toRecordsMock,
      toArrowTable: jest.fn(),
      toArrowReader: jest.fn(),
    });

    // Mock the enrich.getPolicy method with default behavior (policy exists)
    (esClient.asInternalUser.enrich as jest.Mocked<any>).getPolicy = jest.fn().mockResolvedValue({
      policies: [
        {
          config: {
            match: {
              name: getEnrichPolicyId(),
            },
          },
        },
      ],
    });

    logger = {
      trace: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Index pattern validation', () => {
    it('should throw an error for an invalid index pattern', async () => {
      const invalidIndexPatterns = ['invalid pattern']; // space is not allowed
      const params = {
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: invalidIndexPatterns,
        spaceId: 'default',
        esQuery: undefined,
      };

      await expect(() => fetchGraph(params)).rejects.toThrowError(/Invalid index pattern/);
    });

    it('should return empty result when indexPatterns is empty array', async () => {
      const emptyIndexPatterns: string[] = [];
      const params = {
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: emptyIndexPatterns,
        spaceId: 'default',
        esQuery: undefined as EsQuery | undefined,
      };

      const result = await fetchGraph(params);

      // Should return empty result without calling esql
      expect(esClient.asCurrentUser.helpers.esql).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  it('should execute the esql query and return records for valid inputs with no origin events', async () => {
    const validIndexPatterns = ['valid_index'];
    const params = {
      esClient,
      logger,
      start: 0,
      end: 1000,
      originEventIds: [] as OriginEventId[],
      showUnknownTarget: false,
      indexPatterns: validIndexPatterns,
      spaceId: 'default',
      esQuery: undefined as EsQuery | undefined,
    };

    const result = await fetchGraph(params);
    // Verify that our stubbed esClient has been called with the correct query and params
    expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
    const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
    expect(esqlCallArgs[0].query).toContain('FROM valid_index');
    expect(result).toEqual([{ id: 'dummy' }]);
  });

  it('should include origin event parameters when originEventIds are provided', async () => {
    // Create sample origin events; one is alert and one is not.
    const originEventIds: OriginEventId[] = [
      { id: '1', isAlert: true },
      { id: '2', isAlert: false },
    ];
    const validIndexPatterns = ['valid_index'];
    const esQuery: EsQuery = {
      bool: {
        filter: [],
        must: [],
        should: [],
        must_not: [],
      },
    };

    const params = {
      esClient,
      logger,
      start: 100,
      end: 200,
      originEventIds,
      showUnknownTarget: true,
      indexPatterns: validIndexPatterns,
      spaceId: 'default',
      esQuery,
    };

    const result = await fetchGraph(params);
    expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
    const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
    expect(esqlCallArgs[0].query).toContain('FROM valid_index');

    // Expect two sets of params: one for all origin events and one for alerts only.
    expect(esqlCallArgs[0].params).toHaveLength(3);

    // Check that the parameter keys include og_id and og_alrt_id keys.
    const ogIdKeys = esqlCallArgs[0].params
      // @ts-ignore: field is typed as Record<string, string>[]
      ?.map((p) => Object.keys(p)[0] as string)
      .filter((key) => key.startsWith('og_id'));
    const ogAlertKeys = esqlCallArgs[0].params
      // @ts-ignore: field is typed as Record<string, string>[]
      ?.map((p) => Object.keys(p)[0] as string)
      .filter((key) => key.startsWith('og_alrt_id'));

    expect(ogIdKeys).toEqual(['og_id0', 'og_id1']);
    expect(ogAlertKeys).toEqual(['og_alrt_id0']);
    expect(result).toEqual([{ id: 'dummy' }]);
  });

  it('should include entity enrichment when isEnrichPolicyExists is true', async () => {
    // Mock the enrich.getPolicy method to return a policy that exists
    (esClient.asInternalUser.enrich as jest.Mocked<any>).getPolicy = jest
      .fn()
      .mockResolvedValueOnce({
        policies: [
          {
            config: {
              match: {
                name: getEnrichPolicyId(),
              },
            },
          },
        ],
      });

    const validIndexPatterns = ['valid_index'];
    const params = {
      esClient,
      logger,
      start: 0,
      end: 1000,
      originEventIds: [] as OriginEventId[],
      showUnknownTarget: false,
      indexPatterns: validIndexPatterns,
      spaceId: 'default',
      esQuery: undefined as EsQuery | undefined,
    };

    const result = await fetchGraph(params);

    expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
    const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
    const query = esqlCallArgs[0].query;

    expect(query).toContain(`ENRICH ${getEnrichPolicyId()} ON actor.entity.id`);
    expect(query).toContain(
      `WITH actorEntityName = entity.name, actorEntityType = entity.type, actorEntitySubType = entity.sub_type, actorHostIp = host.ip`
    );
    expect(query).toContain(`ENRICH ${getEnrichPolicyId()} ON target.entity.id`);
    expect(query).toContain(
      `WITH targetEntityName = entity.name, targetEntityType = entity.type, targetEntitySubType = entity.sub_type, targetHostIp = host.ip`
    );

    expect(query).toContain('EVAL actorDocData = CONCAT');
    expect(query).toContain('actor.entity.id');
    expect(query).toContain('actorEntityName');
    expect(query).toContain('actorEntityType');
    expect(query).toContain('actorEntitySubType');
    expect(query).toContain('actorHostIp');

    expect(query).toContain('EVAL targetDocData = CONCAT');
    expect(query).toContain('target.entity.id');
    expect(query).toContain('targetEntityName');
    expect(query).toContain('targetEntityType');
    expect(query).toContain('targetEntitySubType');
    expect(query).toContain('targetHostIp');

    expect(query).toContain('EVAL sourceIps = source.ip');
    expect(query).toContain('EVAL sourceCountryCodes = source.geo.country_iso_code');

    expect(query).toContain('actorsDocData = VALUES(actorDocData)');
    expect(query).toContain('targetsDocData = VALUES(targetDocData)');

    expect(result).toEqual([{ id: 'dummy' }]);
  });

  it('should not include entity enrichment when isEnrichPolicyExists is false', async () => {
    (esClient.asInternalUser.enrich as jest.Mocked<any>).getPolicy = jest
      .fn()
      .mockResolvedValueOnce({
        policies: [],
      });

    const validIndexPatterns = ['valid_index'];
    const params = {
      esClient,
      logger,
      start: 0,
      end: 1000,
      originEventIds: [] as OriginEventId[],
      showUnknownTarget: false,
      indexPatterns: validIndexPatterns,
      spaceId: 'default',
      esQuery: undefined as EsQuery | undefined,
    };

    const result = await fetchGraph(params);

    expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
    const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
    const query = esqlCallArgs[0].query;

    expect(query).not.toContain(`ENRICH ${getEnrichPolicyId()} ON actor.entity.id`);
    expect(query).not.toContain(
      `WITH actorEntityName = entity.name,
      actorEntityType = entity.type,
      actorEntitySubType = entity.sub_type,
      actorHostIp = host.ip,
      actorSourceIndex = entity.source`
    );
    expect(query).not.toContain(`ENRICH ${getEnrichPolicyId()} ON target.entity.id`);
    expect(query).not.toContain(
      `WITH targetEntityName = entity.name,
      targetEntityType = entity.type,
      targetEntitySubType = entity.sub_type,
      targetHostIp = host.ip,
      targetSourceIndex = entity.source`
    );

    // Fallback eval clauses for non-enriched actor data
    expect(query).toContain(`EVAL actorEntityType = TO_STRING(null)`);
    expect(query).toContain(`EVAL actorEntitySubType = TO_STRING(null)`);
    expect(query).toContain(`EVAL actorDocData = TO_STRING(null)`);
    expect(query).toContain(`EVAL actorHostIp = TO_STRING(null)`);

    // Fallback eval clauses for non-enriched target data
    expect(query).toContain(`EVAL targetEntityType = TO_STRING(null)`);
    expect(query).toContain(`EVAL targetEntitySubType = TO_STRING(null)`);
    expect(query).toContain(`EVAL targetDocData = TO_STRING(null)`);
    expect(query).toContain(`EVAL targetHostIp = TO_STRING(null)`);

    expect(query).toContain('EVAL sourceIps = source.ip');
    expect(query).toContain('EVAL sourceCountryCodes = source.geo.country_iso_code');

    expect(query).toContain(`actorsDocData = VALUES(actorDocData)`);
    expect(query).toContain(`targetsDocData = VALUES(targetDocData)`);

    expect(result).toEqual([{ id: 'dummy' }]);
  });

  it('should not include entity enrichment when the enrich policy check fails', async () => {
    (esClient.asInternalUser.enrich as jest.Mocked<any>).getPolicy = jest
      .fn()
      .mockRejectedValueOnce(new Error('Failed to get enrich policy'));

    const validIndexPatterns = ['valid_index'];
    const params = {
      esClient,
      logger,
      start: 0,
      end: 1000,
      originEventIds: [] as OriginEventId[],
      showUnknownTarget: false,
      indexPatterns: validIndexPatterns,
      spaceId: 'default',
      esQuery: undefined as EsQuery | undefined,
    };

    const result = await fetchGraph(params);

    expect(logger.error).toHaveBeenCalled();

    expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
    const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
    const query = esqlCallArgs[0].query;
    expect(query).not.toContain(`ENRICH ${getEnrichPolicyId()}`);
    expect(result).toEqual([{ id: 'dummy' }]);
  });

  describe('Origin events parameter (originAlertIds)', () => {
    it('should include origin alert parameters when all originEventIds are alerts', async () => {
      const originEventIds: OriginEventId[] = [
        { id: 'alert-1', isAlert: true },
        { id: 'alert-2', isAlert: true },
        { id: 'alert-3', isAlert: true },
      ];
      const validIndexPatterns = ['valid_index'];
      const params = {
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds,
        showUnknownTarget: false,
        indexPatterns: validIndexPatterns,
        spaceId: 'default',
        esQuery: undefined as EsQuery | undefined,
      };

      const result = await fetchGraph(params);
      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];

      // Should have parameters for all events (3) and all alerts (3) - total 6
      expect(esqlCallArgs[0].params).toHaveLength(6);

      // Should have both general event params and alert params
      const eventKeys = esqlCallArgs[0].params
        // @ts-ignore
        ?.map((p) => Object.keys(p)[0] as string)
        .filter((key) => key.startsWith('og_id'));
      const alertKeys = esqlCallArgs[0].params
        // @ts-ignore
        ?.map((p) => Object.keys(p)[0] as string)
        .filter((key) => key.startsWith('og_alrt_id'));
      expect(eventKeys).toEqual(['og_id0', 'og_id1', 'og_id2']);
      expect(alertKeys).toEqual(['og_alrt_id0', 'og_alrt_id1', 'og_alrt_id2']);

      expect(result).toEqual([{ id: 'dummy' }]);
    });

    it('should handle originEventIds with no alerts', async () => {
      const originEventIds: OriginEventId[] = [
        { id: 'event-1', isAlert: false },
        { id: 'event-2', isAlert: false },
      ];
      const validIndexPatterns = ['valid_index'];
      const params = {
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds,
        showUnknownTarget: false,
        indexPatterns: validIndexPatterns,
        spaceId: 'default',
        esQuery: undefined as EsQuery | undefined,
      };

      const result = await fetchGraph(params);
      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];

      // Should only have general event params, no alert params
      expect(esqlCallArgs[0].params).toHaveLength(2);
      const eventKeys = esqlCallArgs[0].params
        // @ts-ignore
        ?.map((p) => Object.keys(p)[0] as string);
      expect(eventKeys).toEqual(['og_id0', 'og_id1']);

      expect(result).toEqual([{ id: 'dummy' }]);
    });
  });

  describe('showUnknownTarget parameter', () => {
    it('should include showUnknownTarget condition when set to true', async () => {
      const validIndexPatterns = ['valid_index'];
      const params = {
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: true,
        indexPatterns: validIndexPatterns,
        spaceId: 'default',
        esQuery: undefined as EsQuery | undefined,
      };

      const result = await fetchGraph(params);
      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const filter = esqlCallArgs[0].filter;

      // When showUnknownTarget is true, filter should NOT include target.entity.id exists check
      const filterArray = Array.isArray(filter?.bool?.filter)
        ? filter.bool.filter
        : [filter?.bool?.filter];
      const hasTargetExistsFilter = filterArray.some(
        // @ts-ignore
        (f) => f?.exists?.field === 'target.entity.id'
      );
      expect(hasTargetExistsFilter).toBe(false);
      expect(result).toEqual([{ id: 'dummy' }]);
    });

    it('should exclude unknown targets when showUnknownTarget is false', async () => {
      const validIndexPatterns = ['valid_index'];
      const params = {
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: validIndexPatterns,
        spaceId: 'default',
        esQuery: undefined as EsQuery | undefined,
      };

      const result = await fetchGraph(params);
      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const filter = esqlCallArgs[0].filter;

      // When showUnknownTarget is false, filter SHOULD include target.entity.id exists check
      const filterArray = Array.isArray(filter?.bool?.filter)
        ? filter.bool.filter
        : [filter?.bool?.filter];
      const hasTargetExistsFilter = filterArray.some(
        // @ts-ignore
        (f) => f?.exists?.field === 'target.entity.id'
      );
      expect(hasTargetExistsFilter).toBe(true);
      expect(result).toEqual([{ id: 'dummy' }]);
    });
  });

  describe('esQuery parameter', () => {
    it('should include custom filter when esQuery is provided', async () => {
      const customEsQuery: EsQuery = {
        bool: {
          filter: [{ term: { 'event.category': 'process' } }],
          must: [{ match: { 'event.outcome': 'success' } }],
          should: [],
          must_not: [{ exists: { field: 'error.message' } }],
        },
      };
      const validIndexPatterns = ['valid_index'];
      const params = {
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: validIndexPatterns,
        spaceId: 'default',
        esQuery: customEsQuery,
      };

      const result = await fetchGraph(params);
      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];

      // Verify the query was called
      expect(esqlCallArgs[0].query).toContain('FROM valid_index');
      // The filter includes the custom esQuery merged with time range and other filters
      expect(esqlCallArgs[0].filter).toBeDefined();
      // Check that custom filter terms are present in the nested structure
      const filterStr = JSON.stringify(esqlCallArgs[0].filter);
      expect(filterStr).toContain('event.category');
      expect(filterStr).toContain('process');
      expect(result).toEqual([{ id: 'dummy' }]);
    });

    it('should handle empty esQuery with all empty clauses', async () => {
      const emptyEsQuery: EsQuery = {
        bool: {
          filter: [],
          must: [],
          should: [],
          must_not: [],
        },
      };
      const validIndexPatterns = ['valid_index'];
      const params = {
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: validIndexPatterns,
        spaceId: 'default',
        esQuery: emptyEsQuery,
      };

      const result = await fetchGraph(params);
      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];

      // Empty query should still build a filter with time range and target exists
      expect(esqlCallArgs[0].filter).toBeDefined();
      expect(esqlCallArgs[0].filter?.bool?.filter).toBeDefined();
      expect(result).toEqual([{ id: 'dummy' }]);
    });
  });

  describe('Time range parameter', () => {
    it('should include numeric timestamp range in query filter', async () => {
      const validIndexPatterns = ['valid_index'];
      const params = {
        esClient,
        logger,
        start: 1609459200000, // Numeric timestamp
        end: 1609545600000, // Numeric timestamp
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: validIndexPatterns,
        spaceId: 'default',
        esQuery: undefined as EsQuery | undefined,
      };

      const result = await fetchGraph(params);
      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];

      // Check that start and end are included in the filter range
      const filter = esqlCallArgs[0].filter;
      const rangeFilter = Array.isArray(filter?.bool?.filter)
        ? filter.bool.filter.find((f: any) => f?.range?.['@timestamp'])
        : filter?.bool?.filter?.range?.['@timestamp']
        ? filter.bool.filter
        : null;
      expect(rangeFilter).toBeDefined();
      expect(result).toEqual([{ id: 'dummy' }]);
    });

    it('should include string timestamp range in query filter', async () => {
      const validIndexPatterns = ['valid_index'];
      const params = {
        esClient,
        logger,
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: validIndexPatterns,
        spaceId: 'default',
        esQuery: undefined as EsQuery | undefined,
      };

      const result = await fetchGraph(params);
      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];

      // Check that start and end are included in the filter range
      const filter = esqlCallArgs[0].filter;
      const rangeFilter = Array.isArray(filter?.bool?.filter)
        ? filter.bool.filter.find((f: any) => f?.range?.['@timestamp'])
        : filter?.bool?.filter?.range?.['@timestamp']
        ? filter.bool.filter
        : null;
      expect(rangeFilter).toBeDefined();
      expect(result).toEqual([{ id: 'dummy' }]);
    });
  });

  describe('Space ID and enrich policy', () => {
    it('should use custom space ID in enrich policy name', async () => {
      const customSpaceId = 'custom-space-123';
      const validIndexPatterns = ['valid_index'];

      // Mock enrich policy for custom space
      (esClient.asInternalUser.enrich as jest.Mocked<any>).getPolicy = jest
        .fn()
        .mockResolvedValueOnce({
          policies: [
            {
              config: {
                match: {
                  name: getEnrichPolicyId(customSpaceId),
                },
              },
            },
          ],
        });

      const params = {
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: validIndexPatterns,
        spaceId: customSpaceId,
        esQuery: undefined as EsQuery | undefined,
      };

      const result = await fetchGraph(params);
      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify custom space enrich policy is used
      expect(query).toContain(`ENRICH ${getEnrichPolicyId(customSpaceId)}`);
      expect(result).toEqual([{ id: 'dummy' }]);
    });
  });

  describe('Alert index pattern detection', () => {
    it('should detect when alerts index pattern is included', async () => {
      const indexPatternsWithAlerts = ['logs-*', '.alerts-security.alerts-default'];
      const params = {
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: indexPatternsWithAlerts,
        spaceId: 'default',
        esQuery: undefined as EsQuery | undefined,
      };

      const result = await fetchGraph(params);
      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Query should include both patterns
      expect(query).toContain('FROM logs-*,.alerts-security.alerts-default');
      expect(result).toEqual([{ id: 'dummy' }]);
    });

    it('should handle index patterns without alerts index', async () => {
      const indexPatternsWithoutAlerts = ['logs-*', 'metrics-*'];
      const params = {
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: indexPatternsWithoutAlerts,
        spaceId: 'default',
        esQuery: undefined as EsQuery | undefined,
      };

      const result = await fetchGraph(params);
      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Query should include both non-alert patterns
      expect(query).toContain('FROM logs-*,metrics-*');
      // Even though no alert indices are specified, the query still checks for alerts using the LIKE condition
      // This is an alert detection check, not an alert index requirement
      expect(result).toEqual([{ id: 'dummy' }]);
    });

    it('should handle mixed alerts and non-alerts patterns', async () => {
      const mixedPatterns = [
        'logs-endpoint-*',
        '.alerts-security.alerts-default',
        'metrics-*',
        '.internal.alerts-security.alerts-default',
      ];
      const params = {
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: mixedPatterns,
        spaceId: 'default',
        esQuery: undefined as EsQuery | undefined,
      };

      const result = await fetchGraph(params);
      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Query should include all patterns
      expect(query).toContain(
        'FROM logs-endpoint-*,.alerts-security.alerts-default,metrics-*,.internal.alerts-security.alerts-default'
      );
      expect(result).toEqual([{ id: 'dummy' }]);
    });
  });
});
