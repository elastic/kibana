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

  describe('ENRICH policy integration', () => {
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

      const result = await fetchGraph(params);

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

      const result = await fetchGraph(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      expect(query).not.toContain('ENRICH');

      // Verify fallback EVALs are present for null values
      expect(query).toMatch(/EVAL\s+actorEntityType\s*=\s*TO_STRING\(null\)/);
      expect(query).toMatch(/EVAL\s+actorEntitySubType\s*=\s*TO_STRING\(null\)/);
      expect(query).toMatch(/EVAL\s+actorDocData\s*=\s*TO_STRING\(null\)/);
      expect(query).toMatch(/EVAL\s+targetEntityType\s*=\s*TO_STRING\(null\)/);
      expect(query).toMatch(/EVAL\s+targetEntitySubType\s*=\s*TO_STRING\(null\)/);
      expect(query).toMatch(/EVAL\s+targetDocData\s*=\s*TO_STRING\(null\)/);

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

      await fetchGraph(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify COALESCE is used for both actor and target
      expect(query).toMatch(/EVAL\s+actorEntityId\s*=\s*COALESCE\(/);
      expect(query).toMatch(/EVAL\s+targetEntityId\s*=\s*COALESCE\(/);

      // Verify precedence order for actor (user -> host -> service -> entity -> actor)
      const actorCoalesceRegex = /actorEntityId\s*=\s*COALESCE\(([\s\S]*?)\)/;
      const actorCoalesceMatch = actorCoalesceRegex.exec(query);
      expect(actorCoalesceMatch).toBeTruthy();
      if (actorCoalesceMatch) {
        const coalesceContent = actorCoalesceMatch[1];
        const fields = coalesceContent.split(',').map((f) => f.trim());

        // Verify actor precedence order
        expect(fields[0]).toContain('user.entity.id');
        expect(fields[1]).toContain('host.entity.id');
        expect(fields[2]).toContain('service.entity.id');
        expect(fields[3]).toContain('entity.id');
        expect(fields[4]).toContain('actor.entity.id');
      }

      // Verify precedence order for target
      const targetCoalesceRegex = /targetEntityId\s*=\s*COALESCE\(([\s\S]*?)\)/;
      const targetCoalesceMatch = targetCoalesceRegex.exec(query);
      expect(targetCoalesceMatch).toBeTruthy();

      if (targetCoalesceMatch) {
        const coalesceContent = targetCoalesceMatch[1];
        const fields = coalesceContent.split(',').map((f) => f.trim());

        // Verify target precedence order
        expect(fields[0]).toContain('user.target.entity.id');
        expect(fields[1]).toContain('host.target.entity.id');
        expect(fields[2]).toContain('service.target.entity.id');
        expect(fields[3]).toContain('entity.target.id');
        expect(fields[4]).toContain('target.entity.id');
      }
    });

    it('should detect entity types from field presence', async () => {
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

      await fetchGraph(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify type detection logic exists
      expect(query).toMatch(/EVAL\s+detectedActorEntityType\s*=\s*CASE\(/);
      expect(query).toMatch(/EVAL\s+detectedTargetEntityType\s*=\s*CASE\(/);

      // Verify it assigns empty string as fallback (not null or unknown)
      const detectedActorRegex = /detectedActorEntityType\s*=\s*CASE\(([\s\S]*?)\)/;
      const detectedActorMatch = detectedActorRegex.exec(query);
      expect(detectedActorMatch).toBeTruthy();
      if (detectedActorMatch) {
        const caseContent = detectedActorMatch[1];
        // Should end with empty string, not "unknown" or null
        expect(caseContent.trim()).toMatch(/""$/);
      }
    });

    it('should prioritize ENRICH entity type over detected type', async () => {
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

      await fetchGraph(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify entity group logic prioritizes ENRICH type
      // The actorEntityGroup CASE should check actorEntityType (from ENRICH) first,
      // then fall back to detectedActorEntityType
      const actorGroupRegex = /EVAL\s+actorEntityGroup\s*=\s*CASE\(([\s\S]*?)\n\s*\)/m;
      const actorGroupMatch = actorGroupRegex.exec(query);
      expect(actorGroupMatch).toBeTruthy();

      if (actorGroupMatch) {
        const caseContent = actorGroupMatch[1];
        // Verify that actorEntityType (from ENRICH) is checked first
        expect(caseContent).toContain('actorEntityType IS NOT NULL');
        // Verify that detectedActorEntityType is used as fallback
        expect(caseContent).toContain('detectedActorEntityType');
        
        // actorEntityType should appear before detectedActorEntityType in the CASE
        const enrichTypePos = caseContent.indexOf('actorEntityType IS NOT NULL');
        const detectedTypePos = caseContent.indexOf('detectedActorEntityType');
        
        expect(enrichTypePos).toBeGreaterThan(-1);
        expect(detectedTypePos).toBeGreaterThan(-1);
        expect(enrichTypePos).toBeLessThan(detectedTypePos);
      }
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

      await fetchGraph(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const filterArg = esqlCallArgs[0].filter as any;

      // Should have bool.filter with target entity exists checks
      expect(filterArg.bool.filter).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            bool: expect.objectContaining({
              should: expect.arrayContaining([
                { exists: { field: 'user.target.entity.id' } },
                { exists: { field: 'host.target.entity.id' } },
                { exists: { field: 'service.target.entity.id' } },
                { exists: { field: 'entity.target.id' } },
                { exists: { field: 'target.entity.id' } },
              ]),
              minimum_should_match: 1,
            }),
          }),
        ])
      );
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

      await fetchGraph(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const filterArg = esqlCallArgs[0].filter as any;

      // Should not have target entity exists check
      const hasTargetCheck = filterArg.bool.filter.some(
        (f: any) => f.bool?.should?.some((s: any) => s.exists?.field?.includes('target'))
      );
      expect(hasTargetCheck).toBe(false);
    });
  });

  describe('Backward compatibility', () => {
    it('should include old schema fields in WHERE clause', async () => {
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

      await fetchGraph(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Old fields should be included as fallback
      expect(query).toContain('actor.entity.id IS NOT NULL');
    });

    it('should include old schema fields in COALESCE as last resort', async () => {
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

      await fetchGraph(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify old actor.entity.id is last in COALESCE for actorEntityId
      const actorCoalesceRegex = /actorEntityId\s*=\s*COALESCE\(([\s\S]*?)\)/;
      const actorCoalesceMatch = actorCoalesceRegex.exec(query);
      expect(actorCoalesceMatch).toBeTruthy();

      if (actorCoalesceMatch) {
        const coalesceContent = actorCoalesceMatch[1];
        const parts = coalesceContent.split(',').map((p) => p.trim());

        // Last part should contain old actor.entity.id
        expect(parts[parts.length - 1]).toContain('actor.entity.id');
      }

      // Verify old target.entity.id is last in COALESCE for targetEntityId
      const targetCoalesceRegex = /targetEntityId\s*=\s*COALESCE\(([\s\S]*?)\)/;
      const targetCoalesceMatch = targetCoalesceRegex.exec(query);
      expect(targetCoalesceMatch).toBeTruthy();

      if (targetCoalesceMatch) {
        const coalesceContent = targetCoalesceMatch[1];
        const parts = coalesceContent.split(',').map((p) => p.trim());

        // Last part should contain old target.entity.id
        expect(parts[parts.length - 1]).toContain('target.entity.id');
      }
    });

    it('should include old schema target fields in DSL filter', async () => {
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

      await fetchGraph(params);

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const filterArg = esqlCallArgs[0].filter as any;

      // Old target.entity.id field should be included in target filter
      const targetFilter = filterArg.bool.filter.find(
        (f: any) => f.bool?.should?.some((s: any) => s.exists?.field === 'target.entity.id')
      );
      expect(targetFilter).toBeTruthy();
    });
  });
});
