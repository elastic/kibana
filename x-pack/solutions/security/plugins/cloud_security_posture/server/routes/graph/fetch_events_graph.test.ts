/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fetchEvents } from './fetch_events_graph';
import type { Logger } from '@kbn/core/server';
import type { OriginEventId, EsQuery } from './types';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import { GRAPH_ACTOR_EUID_SOURCE_FIELDS, GRAPH_TARGET_EUID_SOURCE_FIELDS } from './constants';

describe('fetchEvents', () => {
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

    logger = {
      trace: jest.fn(),
      debug: jest.fn(),
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

    await expect(() => fetchEvents(params)).rejects.toThrowError(/Invalid index pattern/);
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

    const result = await fetchEvents(params);
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

    const result = await fetchEvents(params);
    expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
    const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
    expect(esqlCallArgs[0].query).toContain('FROM valid_index');

    // Expect two sets of params: one for all origin events and one for alerts only.
    expect(esqlCallArgs[0].params).toHaveLength(3);

    // Check that the parameter keys include og_id and og_alrt_id keys.
    const ogIdKeys = esqlCallArgs[0].params
      // @ts-ignore: field is typed as Record<string, string>[]
      ?.map((p) => Object.keys(p)[0])
      .filter((key) => key.startsWith('og_id'));
    const ogAlertKeys = esqlCallArgs[0].params
      // @ts-ignore: field is typed as Record<string, string>[]
      ?.map((p) => Object.keys(p)[0])
      .filter((key) => key.startsWith('og_alrt_id'));

    expect(ogIdKeys).toEqual(['og_id0', 'og_id1']);
    expect(ogAlertKeys).toEqual(['og_alrt_id0']);
    expect(result).toEqual([{ id: 'dummy' }]);
  });

  describe('LOOKUP JOIN integration', () => {
    it('should include LOOKUP JOIN clause when entities index is in lookup mode', async () => {
      const indexName = getEntitiesLatestIndexName('default');

      // Mock the indices.getSettings to return lookup mode
      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockResolvedValueOnce({
          [indexName]: {
            settings: {
              index: {
                mode: 'lookup',
              },
            },
          },
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

      const result = await fetchEvents(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify LOOKUP JOIN is used (preferred over ENRICH)
      expect(query).toContain(`LOOKUP JOIN ${indexName} ON entity.id`);

      // Verify LOOKUP JOIN populates expected fields
      expect(query).toContain('actorEntityName');
      expect(query).toContain('actorEntityType');
      expect(query).toContain('actorEntitySubType');
      expect(query).toContain('targetEntityName');
      expect(query).toContain('targetEntityType');
      expect(query).toContain('targetEntitySubType');

      expect(result).toEqual([{ id: 'dummy' }]);
    });

    it('should not include LOOKUP JOIN clause when entities index is not in lookup mode', async () => {
      const indexName = getEntitiesLatestIndexName('default');

      // Mock the indices.getSettings to return standard mode (not lookup)
      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockResolvedValueOnce({
          [indexName]: {
            settings: {
              index: {
                mode: 'standard',
              },
            },
          },
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

      const result = await fetchEvents(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify LOOKUP JOIN is NOT used
      expect(query).not.toContain('LOOKUP JOIN');

      // Verify fallback EVALs are present for null values
      expect(query).toMatch(/EVAL\s+actorEntityName\s*=\s*TO_STRING\(null\)/);
      expect(query).toMatch(/EVAL\s+targetEntityName\s*=\s*TO_STRING\(null\)/);

      expect(result).toEqual([{ id: 'dummy' }]);
    });

    it('should not include LOOKUP JOIN when entities index does not exist', async () => {
      // Mock the indices.getSettings to throw 404 (index not found)
      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockRejectedValueOnce({ statusCode: 404 });

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

      const result = await fetchEvents(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify LOOKUP JOIN is NOT used
      expect(query).not.toContain('LOOKUP JOIN');

      expect(result).toEqual([{ id: 'dummy' }]);
    });
  });

  describe('EUID-based resolution', () => {
    it('should use COALESCE with per-type EUID variables for actor resolution', async () => {
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

      await fetchEvents(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify COALESCE is used for actor identification
      expect(query).toMatch(/EVAL\s+actorEntityId\s*=\s*COALESCE\(/);

      // Verify per-type EUID variables are computed
      expect(query).toContain('_actor_user_euid');
      expect(query).toContain('_actor_host_euid');
      expect(query).toContain('_actor_service_euid');

      // Verify EUID source fields are referenced in the query
      for (const field of [
        ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.user,
        ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.host,
        ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.service,
        ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.generic,
      ]) {
        expect(query).toContain(field);
      }

      // Verify target EUID variables are computed
      expect(query).toContain('_target_user_euid');
      expect(query).toContain('_target_host_euid');
      expect(query).toContain('_target_service_euid');
      expect(query).toContain('_target_generic_euid');

      // Verify target entity ID uses multi-value collection
      expect(query).toContain('EVAL targetEntityId = TO_STRING(null)');
      expect(query).toMatch(/EVAL\s+targetEntityId\s*=\s*CASE\(/);
      expect(query).toContain('MV_APPEND(targetEntityId, _target_user_euid)');
      expect(query).toContain('MV_APPEND(targetEntityId, _target_host_euid)');
      expect(query).toContain('MV_APPEND(targetEntityId, _target_service_euid)');
      expect(query).toContain('MV_APPEND(targetEntityId, _target_generic_euid)');
    });

    it('should include user EUID source fields in actor sourceFields', async () => {
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

      await fetchEvents(params);

      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify user EUID source fields appear in the sourceFields JSON construction
      expect(query).toContain('\\"user.email\\"');
      expect(query).toContain('\\"user.id\\"');
      expect(query).toContain('\\"user.name\\"');
    });

    it('should include host EUID source fields in actor sourceFields', async () => {
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

      await fetchEvents(params);

      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify host EUID source fields appear in the sourceFields JSON construction
      expect(query).toContain('\\"host.id\\"');
      expect(query).toContain('\\"host.name\\"');
      expect(query).toContain('\\"host.hostname\\"');
    });

    it('should include service EUID source fields in actor sourceFields', async () => {
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

      await fetchEvents(params);

      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify service EUID source field appears in the sourceFields JSON construction
      expect(query).toContain('\\"service.name\\"');
    });

    it('should include target EUID source fields in target sourceFields', async () => {
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

      await fetchEvents(params);

      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify target EUID source field values appear in the sourceFields JSON construction
      // The JSON keys use actor-namespace names (e.g., "user.email") while the values
      // reference saved target-namespace field variables (e.g., _sf_user_target_email)
      expect(query).toContain('_sf_user_target_email');
      expect(query).toContain('_sf_user_target_id');
      expect(query).toContain('_sf_host_target_id');
      expect(query).toContain('_sf_service_target_name');
    });
  });

  describe('Target entity filtering', () => {
    it('should check all EUID source target fields when showUnknownTarget is false', async () => {
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

      await fetchEvents(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const filterArg = esqlCallArgs[0].filter as any;

      // Should have bool.filter with target EUID source field exists checks
      const allTargetFields = [
        ...GRAPH_TARGET_EUID_SOURCE_FIELDS.user,
        ...GRAPH_TARGET_EUID_SOURCE_FIELDS.host,
        ...GRAPH_TARGET_EUID_SOURCE_FIELDS.service,
        ...GRAPH_TARGET_EUID_SOURCE_FIELDS.generic,
      ];
      const expectedExistsChecks = allTargetFields.map((field) => ({
        exists: { field },
      }));
      expect(filterArg.bool.filter).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            bool: expect.objectContaining({
              should: expect.arrayContaining(expectedExistsChecks),
              minimum_should_match: 1,
            }),
          }),
        ])
      );

      const targetFilter = filterArg.bool.filter.find((f: any) =>
        f.bool?.should?.some((s: any) => s.exists?.field?.includes('target'))
      );
      expect(targetFilter?.bool?.should).toHaveLength(allTargetFields.length);
    });

    it('should not filter targets when showUnknownTarget is true', async () => {
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

      await fetchEvents(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const filterArg = esqlCallArgs[0].filter as any;

      // Should not have target entity exists check
      const hasTargetCheck = filterArg.bool.filter.some((f: any) =>
        f.bool?.should?.some((s: any) => s.exists?.field?.includes('target'))
      );
      expect(hasTargetCheck).toBe(false);
    });
  });
});
