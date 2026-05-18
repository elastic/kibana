/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fetchEvents, regroupEvents, enrichEventDocData } from './fetch_events_graph';
import type { Logger } from '@kbn/core/server';
import type { OriginEventId, EsQuery, EventEdge } from './types';
import { GRAPH_ACTOR_EUID_SOURCE_FIELDS, GRAPH_TARGET_EUID_SOURCE_FIELDS } from './constants';
import type { EntityEnrichmentFields } from './fetch_entity_enrichment';

// Expose the internal constant for tests
const EVENTS_ESQL_LIMIT = 50000;

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

  describe('enrichment integration', () => {
    it('should NOT include LOOKUP JOIN in the query', async () => {
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

      // LOOKUP JOIN is removed in favour of follow-up TypeScript enrichment
      expect(query).not.toContain('LOOKUP JOIN');
    });

    it('should group STATS BY actorEntityId and targetEntityId', async () => {
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

      // Must group BY actor and target entity IDs (not type/subtype — those come from enrichment)
      expect(query).toContain('BY action = event.action');
      expect(query).toContain('actorEntityId');
      expect(query).toContain('targetEntityId');

      // Must NOT group by type/subtype since those come from enrichment
      expect(query).not.toMatch(/BY.*actorEntityType/);
      expect(query).not.toMatch(/BY.*actorEntitySubType/);
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

// Helper to build a minimal EventEdge for tests
const buildEventEdge = (
  overrides: Partial<EventEdge> & Pick<EventEdge, 'actorEntityId'>
): EventEdge => ({
  badge: 1,
  action: 'test-action',
  actorNodeId: overrides.actorEntityId ?? 'actor-id',
  actorIdsCount: 1,
  targetNodeId: overrides.targetEntityId ?? null,
  targetIdsCount: overrides.targetEntityId ? 1 : 0,
  docs: ['{"id":"doc-1","type":"event"}'],
  isAlert: false,
  isOrigin: false,
  isOriginAlert: false,
  uniqueEventsCount: 1,
  uniqueAlertsCount: 0,
  labelNodeId: 'doc-1',
  actorsDocData: [`{"id":"${overrides.actorEntityId}","type":"entity","sourceFields":{}}`],
  targetsDocData: overrides.targetEntityId
    ? [`{"id":"${overrides.targetEntityId}","type":"entity","sourceFields":{}}`]
    : [],
  ...overrides,
});

describe('regroupEvents', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;
  });

  it('returns empty array for empty input', () => {
    const result = regroupEvents([], new Map(), logger);
    expect(result).toEqual([]);
  });

  it('single record with no enrichment produces one group with null actorEntityType and raw docData passed through', () => {
    const record = buildEventEdge({ actorEntityId: 'user:alice', targetEntityId: 'host:server1' });
    const result = regroupEvents([record], new Map(), logger);

    expect(result).toHaveLength(1);
    const [group] = result;
    expect(group.actorNodeId).toBe('user:alice');
    expect(group.actorEntityType).toBeNull();

    // Raw docData should be passed through unchanged (no entity object built yet)
    expect(group.actorsDocData).toEqual(record.actorsDocData);
    expect(group.targetsDocData).toEqual(record.targetsDocData);
  });

  it('single record with enrichment produces correct actorEntityType and actorEntitySubType', () => {
    const record = buildEventEdge({ actorEntityId: 'user:alice', targetEntityId: 'host:server1' });
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      [
        'user:alice',
        { name: 'Alice', type: 'user', subType: 'admin', engineType: 'ecs', hostIps: [] },
      ],
    ]);

    const result = regroupEvents([record], enrichmentMap, logger);

    expect(result).toHaveLength(1);
    const [group] = result;
    expect(group.actorEntityType).toBe('user');
    expect(group.actorEntitySubType).toBe('admin');

    // Raw docData still passed through (no entity object built yet)
    expect(group.actorsDocData).toEqual(record.actorsDocData);
  });

  it('two records with same action but different actorEntityIds in same type group are merged into one group with MD5 actorNodeId', () => {
    const record1 = buildEventEdge({
      actorEntityId: 'user:alice',
      targetEntityId: 'host:server1',
      badge: 1,
      uniqueEventsCount: 1,
      uniqueAlertsCount: 0,
      docs: ['{"id":"doc-alice","type":"event"}'],
    });
    const record2 = buildEventEdge({
      actorEntityId: 'user:bob',
      targetEntityId: 'host:server1',
      badge: 2,
      uniqueEventsCount: 2,
      uniqueAlertsCount: 0,
      docs: ['{"id":"doc-bob","type":"event"}'],
    });

    // Both actors map to type 'user', so they share the same group key
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      ['user:alice', { name: 'Alice', type: 'user', subType: null, engineType: null, hostIps: [] }],
      ['user:bob', { name: 'Bob', type: 'user', subType: null, engineType: null, hostIps: [] }],
      [
        'host:server1',
        { name: 'server1', type: 'host', subType: null, engineType: null, hostIps: [] },
      ],
    ]);

    const result = regroupEvents([record1, record2], enrichmentMap, logger);

    expect(result).toHaveLength(1);
    const [group] = result;
    expect(group.badge).toBe(3);

    // actorNodeId should be SHA-256 of sorted IDs joined by ","
    const expectedNodeId = createHash('sha256')
      .update(['user:alice', 'user:bob'].sort().join(','))
      .digest('hex');
    expect(group.actorNodeId).toBe(expectedNodeId);
  });

  it('two records with different actorType (after enrichment) produce two separate groups', () => {
    const record1 = buildEventEdge({ actorEntityId: 'user:alice', targetEntityId: 'host:server1' });
    const record2 = buildEventEdge({
      actorEntityId: 'host:webserver',
      targetEntityId: 'host:server1',
    });

    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      ['user:alice', { name: 'Alice', type: 'user', subType: null, engineType: null, hostIps: [] }],
      [
        'host:webserver',
        { name: 'webserver', type: 'host', subType: null, engineType: null, hostIps: [] },
      ],
    ]);

    const result = regroupEvents([record1, record2], enrichmentMap, logger);

    expect(result).toHaveLength(2);
  });

  it('labelNodeId is MD5 of sorted doc IDs when multiple docs', () => {
    const record1 = buildEventEdge({
      actorEntityId: 'user:alice',
      docs: ['{"id":"doc-a","type":"event"}'],
      labelNodeId: 'doc-a',
    });
    const record2 = buildEventEdge({
      actorEntityId: 'user:alice',
      docs: ['{"id":"doc-b","type":"event"}'],
      labelNodeId: 'doc-b',
      badge: 2,
      uniqueEventsCount: 2,
      uniqueAlertsCount: 0,
    });

    // No enrichment so both stay in the same group (same null type)
    const result = regroupEvents([record1, record2], new Map(), logger);

    expect(result).toHaveLength(1);
    const [group] = result;

    const expectedLabelNodeId = createHash('sha256')
      .update(['doc-a', 'doc-b'].join(','))
      .digest('hex');
    expect(group.labelNodeId).toBe(expectedLabelNodeId);
  });

  it('does not double-count uniqueEventsCount when same document expands to multiple actor EUIDs of same type', () => {
    const sharedDoc = '{"id":"shared-doc-1","type":"event"}';
    const record1 = buildEventEdge({
      actorEntityId: 'user:alice',
      targetEntityId: 'host:server1',
      docs: [sharedDoc],
      uniqueEventsCount: 1,
      uniqueAlertsCount: 0,
    });
    const record2 = buildEventEdge({
      actorEntityId: 'user:bob',
      targetEntityId: 'host:server1',
      docs: [sharedDoc],
      uniqueEventsCount: 1,
      uniqueAlertsCount: 0,
    });

    // Both actors map to type 'user', so they share the same group key
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      ['user:alice', { name: 'Alice', type: 'user', subType: null, engineType: null, hostIps: [] }],
      ['user:bob', { name: 'Bob', type: 'user', subType: null, engineType: null, hostIps: [] }],
    ]);

    const result = regroupEvents([record1, record2], enrichmentMap, logger);

    expect(result).toHaveLength(1);
    // The same doc appears in both records but should only be counted once
    expect(result[0].uniqueEventsCount).toBe(1);
    expect(result[0].uniqueAlertsCount).toBe(0);
  });

  it('logs warn when records count equals EVENTS_ESQL_LIMIT', () => {
    const records = Array.from({ length: EVENTS_ESQL_LIMIT }, (_, i) =>
      buildEventEdge({
        actorEntityId: `user:entity${i}`,
        docs: [`{"id":"doc-${i}","type":"event"}`],
      })
    );

    regroupEvents(records, new Map(), logger);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`${EVENTS_ESQL_LIMIT}`));
  });

  it('sorts groups by action DESC then pinned ASC then isOrigin DESC', () => {
    const recordA = buildEventEdge({
      actorEntityId: 'user:alice',
      action: 'aaa-action',
      isOrigin: false,
      pinned: null,
    });
    const recordB = buildEventEdge({
      actorEntityId: 'user:bob',
      action: 'zzz-action',
      isOrigin: true,
      pinned: null,
    });
    const recordC = buildEventEdge({
      actorEntityId: 'user:charlie',
      action: 'mmm-action',
      isOrigin: false,
      pinned: 'user:charlie',
    });

    const result = regroupEvents([recordA, recordB, recordC], new Map(), logger);

    // 'zzz-action' DESC first, then 'mmm-action', then 'aaa-action'
    expect(result[0].action).toBe('zzz-action');
    expect(result[1].action).toBe('mmm-action');
    expect(result[2].action).toBe('aaa-action');
  });
});

describe('enrichEventDocData', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;
  });

  it('returns empty array for empty input', () => {
    const result = enrichEventDocData([], new Map());
    expect(result).toEqual([]);
  });

  it('rebuilds actorsDocData with availableInEntityStore=false when no enrichment', () => {
    const record = buildEventEdge({ actorEntityId: 'user:alice', targetEntityId: 'host:server1' });
    const grouped = regroupEvents([record], new Map(), logger);
    const result = enrichEventDocData(grouped, new Map());

    expect(result).toHaveLength(1);
    const [group] = result;

    const actorDoc = JSON.parse((group.actorsDocData as string[])[0]);
    expect(actorDoc.entity.availableInEntityStore).toBe(false);

    const targetDoc = JSON.parse((group.targetsDocData as string[])[0]);
    expect(targetDoc.entity.availableInEntityStore).toBe(false);
  });

  it('rebuilds actorsDocData with availableInEntityStore=true and metadata when enrichment found', () => {
    const record = buildEventEdge({ actorEntityId: 'user:alice', targetEntityId: 'host:server1' });
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      [
        'user:alice',
        { name: 'Alice', type: 'user', subType: 'admin', engineType: 'ecs', hostIps: [] },
      ],
    ]);

    const grouped = regroupEvents([record], enrichmentMap, logger);
    const result = enrichEventDocData(grouped, enrichmentMap);

    expect(result).toHaveLength(1);
    const [group] = result;

    const actorDoc = JSON.parse((group.actorsDocData as string[])[0]);
    expect(actorDoc.entity.availableInEntityStore).toBe(true);
    expect(actorDoc.entity.name).toBe('Alice');
    expect(actorDoc.entity.type).toBe('user');
    expect(actorDoc.entity.sub_type).toBe('admin');
  });
});
