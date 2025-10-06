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
    (esClient.asCurrentUser.helpers as jest.Mocked<any>).esql = jest.fn().mockReturnValue({
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
    expect(query).toContain('actorEntityGroup'); // <-- should be present because we group by type and sub_type
    expect(query).toContain('actorEntityName');
    expect(query).toContain('actorEntityType');
    expect(query).toContain('actorEntitySubType');
    expect(query).toContain('actorHostIp');

    expect(query).toContain('EVAL targetDocData = CONCAT');
    expect(query).toContain('target.entity.id');
    expect(query).toContain('targetEntityGroup'); // <-- should be present because we group by type and sub_type
    expect(query).toContain('targetEntityName');
    expect(query).toContain('targetEntityType');
    expect(query).toContain('targetEntitySubType');
    expect(query).toContain('targetHostIp');

    expect(query).toContain('EVAL sourceIps = source.ip');
    expect(query).toContain('EVAL sourceCountryCodes = source.geo.country_iso_code');

    expect(query).toContain('actorsDocData = VALUES(actorDocData)');
    expect(query).toContain('targetsDocData = VALUES(targetDocData)');
    expect(query).toContain('actorEntityGroup = VALUES(actorEntityGroup)');
    expect(query).toContain('targetEntityGroup = VALUES(targetEntityGroup)');

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

    // Fallback eval clauses for non-enriched contextual data
    expect(query).toContain(`EVAL sourceIps = TO_STRING(null)`);
    expect(query).toContain(`EVAL sourceCountryCodes = TO_STRING(null)`);

    expect(query).toContain(`actorsDocData = VALUES(actorDocData)`);
    expect(query).toContain(`targetsDocData = VALUES(targetDocData)`);

    expect(query).toContain('EVAL actorEntityGroup = CASE'); // <-- should be present because we group by id
    expect(query).toContain('EVAL targetEntityGroup = CASE'); // <-- should be present because we group by id
    expect(query).toContain('actorEntityGroup = VALUES(actorEntityGroup)');
    expect(query).toContain('targetEntityGroup = VALUES(targetEntityGroup)');

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
});
