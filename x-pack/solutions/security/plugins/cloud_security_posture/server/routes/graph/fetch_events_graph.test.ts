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
import {
  getEnrichPolicyId,
  getEntitiesLatestIndexName,
} from '@kbn/cloud-security-posture-common/utils/helpers';

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

      // Verify ENRICH is NOT used when LOOKUP JOIN is available
      expect(query).not.toContain('ENRICH');

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

      // Also mock enrich policy to not exist
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

      const result = await fetchEvents(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify LOOKUP JOIN is NOT used
      expect(query).not.toContain('LOOKUP JOIN');

      // Verify ENRICH is also NOT used (no policy exists)
      expect(query).not.toContain('ENRICH');

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

      // Also mock enrich policy to not exist
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

      const result = await fetchEvents(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify LOOKUP JOIN is NOT used
      expect(query).not.toContain('LOOKUP JOIN');

      expect(result).toEqual([{ id: 'dummy' }]);
    });
  });

  describe('ENRICH policy integration', () => {
    beforeEach(() => {
      // Default: no lookup index available (falls back to ENRICH check)
      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockRejectedValue({ statusCode: 404 });
    });

    it('should include ENRICH clause when policy exists', async () => {
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

      const result = await fetchEvents(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Test high-level structure using flexible regex patterns
      // Note: enrich policy names can contain dots, underscores, and version numbers
      expect(query).toMatch(/ENRICH\s+[\w.-]+\s+ON\s+actorEntityId/);
      expect(query).toMatch(/ENRICH\s+[\w.-]+\s+ON\s+targetEntityId/);

      // Verify ENRICH populates expected fields
      expect(query).toContain('actorEntityName');
      expect(query).toContain('actorEntityType');
      expect(query).toContain('actorEntitySubType');
      expect(query).toContain('targetEntityName');
      expect(query).toContain('targetEntityType');
      expect(query).toContain('targetEntitySubType');

      expect(result).toEqual([{ id: 'dummy' }]);
    });

    it('should not include ENRICH clause when policy does not exist', async () => {
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

      const result = await fetchEvents(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      expect(query).not.toContain('ENRICH');

      // Verify fallback EVALs are present for null values
      expect(query).toMatch(/EVAL\s+actorEntityName\s*=\s*TO_STRING\(null\)/);
      expect(query).toMatch(/EVAL\s+actorEntityType\s*=\s*TO_STRING\(null\)/);
      expect(query).toMatch(/EVAL\s+actorEntitySubType\s*=\s*TO_STRING\(null\)/);
      expect(query).toMatch(/EVAL\s+targetEntityName\s*=\s*TO_STRING\(null\)/);
      expect(query).toMatch(/EVAL\s+targetEntityType\s*=\s*TO_STRING\(null\)/);
      expect(query).toMatch(/EVAL\s+targetEntitySubType\s*=\s*TO_STRING\(null\)/);

      // Verify that actorDocData and targetDocData are created with minimal structure (not null)
      expect(query).toMatch(/EVAL\s+actorDocData\s*=\s*CONCAT\(/);
      expect(query).toMatch(/EVAL\s+targetDocData\s*=\s*CONCAT\(/);
      expect(query).toContain('availableInEntityStore');
      expect(query).toContain('ecsParentField');

      expect(result).toEqual([{ id: 'dummy' }]);
    });
  });

  describe('New ECS schema support', () => {
    it('should use COALESCE to unify entity IDs with correct precedence', async () => {
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

      // Verify precedence order for actor (user -> host -> service -> entity)
      const actorCoalesceRegex = /actorEntityId\s*=\s*COALESCE\(([\s\S]*?)\)/;
      const actorCoalesceMatch = actorCoalesceRegex.exec(query);
      expect(actorCoalesceMatch).toBeTruthy();
      if (actorCoalesceMatch) {
        const coalesceContent = actorCoalesceMatch[1];
        const fields = coalesceContent.split(',').map((f) => f.trim());

        // Verify actor precedence order (new ECS fields only)
        expect(fields[0]).toContain('user.entity.id');
        expect(fields[1]).toContain('host.entity.id');
        expect(fields[2]).toContain('service.entity.id');
        expect(fields[3]).toContain('entity.id');
        // Should only have 4 fields (no legacy actor.entity.id)
        expect(fields).toHaveLength(4);
      }

      // Verify target entity ID uses multi-value collection with CASE statements and MV_APPEND
      // (to support multiple targets from different fields)
      // targetEntityId is initialized to null, then all fields use the same CASE pattern
      expect(query).toContain('EVAL targetEntityId = TO_STRING(null)');
      expect(query).toMatch(/EVAL\s+targetEntityId\s*=\s*CASE\(/);
      expect(query).toContain('MV_APPEND(targetEntityId, user.target.entity.id)');
      expect(query).toContain('MV_APPEND(targetEntityId, host.target.entity.id)');
      expect(query).toContain('MV_APPEND(targetEntityId, service.target.entity.id)');
      expect(query).toContain('MV_APPEND(targetEntityId, entity.target.id)');
    });
  });

  describe('Target entity filtering', () => {
    it('should check all target entity fields when showUnknownTarget is false', async () => {
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

      // Should have bool.filter with target entity exists checks (new ECS fields only)
      expect(filterArg.bool.filter).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            bool: expect.objectContaining({
              should: expect.arrayContaining([
                { exists: { field: 'user.target.entity.id' } },
                { exists: { field: 'host.target.entity.id' } },
                { exists: { field: 'service.target.entity.id' } },
                { exists: { field: 'entity.target.id' } },
              ]),
              minimum_should_match: 1,
            }),
          }),
        ])
      );

      const targetFilter = filterArg.bool.filter.find((f: any) =>
        f.bool?.should?.some((s: any) => s.exists?.field?.includes('target'))
      );
      expect(targetFilter?.bool?.should).toHaveLength(4);
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
