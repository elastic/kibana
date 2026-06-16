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
import type { OriginEventId, EsQuery, EventEsqlRow } from './types';
import { GRAPH_ACTOR_EUID_SOURCE_FIELDS, GRAPH_TARGET_EUID_SOURCE_FIELDS } from './constants';
import type { EntityEnrichmentFields } from './fetch_entity_enrichment';

describe('fetchEvents', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  let logger: Logger;

  beforeEach(() => {
    // Match the real `EsqlToRecords` shape `{ columns, records }`.
    const toRecordsMock = jest.fn().mockResolvedValue({ columns: [], records: [{ id: 'dummy' }] });
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
    expect(result).toEqual({ columns: [], records: [{ id: 'dummy' }] });
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
    expect(result).toEqual({ columns: [], records: [{ id: 'dummy' }] });
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

    it('projects per-triple rows via KEEP for TypeScript-side regrouping', async () => {
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

      // Verify the KEEP projection lists all per-triple fields TS regrouping consumes
      expect(query).toMatch(
        /\| KEEP _id, action, actorEntityId, targetEntityId, isOrigin, isOriginAlert, isAlert, pinned, docData, sourceIps, sourceCountryCodes, actorDocData, targetDocData/
      );
      expect(query).toContain('LIMIT 1000');
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

  describe('CPS projectRouting', () => {
    const ALERTS_PATTERN = '.alerts-security.alerts-default';

    it('issues a single query and omits project_routing when only logs patterns are supplied without routing', async () => {
      await fetchEvents({
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: ['logs-*'],
        spaceId: 'default',
        esQuery: undefined as EsQuery | undefined,
      });

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const [args] = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      expect(args.query).toContain('FROM logs-*');
      expect(args).not.toHaveProperty('project_routing');
    });

    it('issues a single alerts query and forwards project_routing when only the alerts pattern is supplied', async () => {
      await fetchEvents({
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: [ALERTS_PATTERN],
        spaceId: 'default',
        esQuery: undefined as EsQuery | undefined,
        projectRouting: '_alias:*',
      });

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const [args] = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      expect(args.query).toContain(`FROM ${ALERTS_PATTERN}`);
      // Alerts now fan out across linked projects like the rest of the alert flyout.
      expect(args.project_routing).toBe('_alias:*');
    });

    it('issues a single query against both patterns and forwards project_routing to it', async () => {
      await fetchEvents({
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: [ALERTS_PATTERN, 'logs-*'],
        spaceId: 'default',
        esQuery: undefined as EsQuery | undefined,
        projectRouting: '_alias:*',
      });

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const [args] = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      expect(args.query).toContain(`FROM ${ALERTS_PATTERN},logs-*`);
      expect(args.project_routing).toBe('_alias:*');
    });

    it('passes _alias:_origin through unchanged when supplied', async () => {
      await fetchEvents({
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: ['logs-*'],
        spaceId: 'default',
        esQuery: undefined as EsQuery | undefined,
        projectRouting: '_alias:_origin',
      });

      const [args] = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      expect(args.project_routing).toBe('_alias:_origin');
    });

    it('omits project_routing on the events query when no projectRouting is supplied', async () => {
      await fetchEvents({
        esClient,
        logger,
        start: 0,
        end: 1000,
        originEventIds: [] as OriginEventId[],
        showUnknownTarget: false,
        indexPatterns: [ALERTS_PATTERN, 'logs-*'],
        spaceId: 'default',
        esQuery: undefined as EsQuery | undefined,
        // projectRouting intentionally omitted — stateful / non-CPS regression.
      });

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const [args] = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      expect(args).not.toHaveProperty('project_routing');
    });
  });
});

// Helper to build a minimal EventEsqlRow (per-triple ESQL output) for tests
let nextRowId = 0;
const buildEventEsqlRow = (
  overrides: Partial<EventEsqlRow> & Pick<EventEsqlRow, 'actorEntityId'>
): EventEsqlRow => {
  const _id = overrides._id ?? `doc-${++nextRowId}`;
  return {
    _id,
    action: 'test-action',
    targetEntityId: overrides.targetEntityId ?? null,
    isOrigin: false,
    isOriginAlert: false,
    isAlert: false,
    pinned: null,
    docData: `{"id":"${_id}","type":"event"}`,
    actorDocData: `{"id":"${overrides.actorEntityId}","type":"entity","sourceFields":{}}`,
    targetDocData: overrides.targetEntityId
      ? `{"id":"${overrides.targetEntityId}","type":"entity","sourceFields":{}}`
      : '',
    ...overrides,
  };
};

describe('regroupEvents', () => {
  it('returns empty array for empty input', () => {
    const result = regroupEvents([], new Map());
    expect(result).toEqual([]);
  });

  it('single record with no enrichment produces one group with null actorEntityType and actorDocData passed through', () => {
    const record = buildEventEsqlRow({
      actorEntityId: 'user:alice',
      targetEntityId: 'host:server1',
    });
    const result = regroupEvents([record], new Map());

    expect(result).toHaveLength(1);
    const [group] = result;
    expect(group.actorNodeId).toBe('user:alice');
    expect(group.actorEntityType).toBeNull();

    // Raw docData should be passed through unchanged (no entity object built yet)
    expect(group.actorsDocData).toEqual([record.actorDocData]);
    expect(group.targetsDocData).toEqual([record.targetDocData]);
  });

  it('single record with enrichment produces correct actorEntityType and actorEntitySubType', () => {
    const record = buildEventEsqlRow({
      actorEntityId: 'user:alice',
      targetEntityId: 'host:server1',
    });
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      [
        'user:alice',
        { name: 'Alice', type: 'user', subType: 'admin', engineType: 'ecs', hostIps: [] },
      ],
    ]);

    const result = regroupEvents([record], enrichmentMap);

    expect(result).toHaveLength(1);
    const [group] = result;
    expect(group.actorEntityType).toBe('user');
    expect(group.actorEntitySubType).toBe('admin');

    // Raw docData still passed through (no entity object built yet)
    expect(group.actorsDocData).toEqual([record.actorDocData]);
  });

  it('badge counts the number of per-triple rows merged into a group', () => {
    // Three per-triple rows: alice→server1 (once), bob→server1 (twice).
    // All collapse into one (user, host) group → badge = 3.
    const record1 = buildEventEsqlRow({
      actorEntityId: 'user:alice',
      targetEntityId: 'host:server1',
      _id: 'doc-1',
    });
    const record2 = buildEventEsqlRow({
      actorEntityId: 'user:bob',
      targetEntityId: 'host:server1',
      _id: 'doc-2',
    });
    const record3 = buildEventEsqlRow({
      actorEntityId: 'user:bob',
      targetEntityId: 'host:server1',
      _id: 'doc-3',
    });

    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      ['user:alice', { name: 'Alice', type: 'user', subType: null, engineType: null, hostIps: [] }],
      ['user:bob', { name: 'Bob', type: 'user', subType: null, engineType: null, hostIps: [] }],
      [
        'host:server1',
        { name: 'server1', type: 'host', subType: null, engineType: null, hostIps: [] },
      ],
    ]);

    const result = regroupEvents([record1, record2, record3], enrichmentMap);

    expect(result).toHaveLength(1);
    const [group] = result;
    expect(group.badge).toBe(3);

    // actorNodeId should be SHA-256 of sorted unique entity IDs joined by ","
    const expectedNodeId = createHash('sha256')
      .update(['user:alice', 'user:bob'].sort().join(','))
      .digest('hex');
    expect(group.actorNodeId).toBe(expectedNodeId);
  });

  it('two records with different actorType (after enrichment) produce two separate groups', () => {
    const record1 = buildEventEsqlRow({
      actorEntityId: 'user:alice',
      targetEntityId: 'host:server1',
    });
    const record2 = buildEventEsqlRow({
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

    const result = regroupEvents([record1, record2], enrichmentMap);

    expect(result).toHaveLength(2);
  });

  it('labelNodeId is SHA-256 of sorted document _ids when multiple docs', () => {
    const record1 = buildEventEsqlRow({
      actorEntityId: 'user:alice',
      _id: 'doc-a',
    });
    const record2 = buildEventEsqlRow({
      actorEntityId: 'user:alice',
      _id: 'doc-b',
    });

    // No enrichment so both stay in the same group (same null type)
    const result = regroupEvents([record1, record2], new Map());

    expect(result).toHaveLength(1);
    const [group] = result;

    const expectedLabelNodeId = createHash('sha256')
      .update(['doc-a', 'doc-b'].join(','))
      .digest('hex');
    expect(group.labelNodeId).toBe(expectedLabelNodeId);
  });

  it('does not double-count uniqueEventsCount when same document expands to multiple actor EUIDs of same type', () => {
    // Same _id appears in two rows (one event MV_EXPANDed to alice and bob actors).
    // After regroup, uniqueEventsCount dedupes on _id → 1, not 2.
    const record1 = buildEventEsqlRow({
      actorEntityId: 'user:alice',
      targetEntityId: 'host:server1',
      _id: 'shared-doc-1',
      isAlert: false,
    });
    const record2 = buildEventEsqlRow({
      actorEntityId: 'user:bob',
      targetEntityId: 'host:server1',
      _id: 'shared-doc-1',
      isAlert: false,
    });

    // Both actors map to type 'user', so they share the same group key
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      ['user:alice', { name: 'Alice', type: 'user', subType: null, engineType: null, hostIps: [] }],
      ['user:bob', { name: 'Bob', type: 'user', subType: null, engineType: null, hostIps: [] }],
    ]);

    const result = regroupEvents([record1, record2], enrichmentMap);

    expect(result).toHaveLength(1);
    expect(result[0].uniqueEventsCount).toBe(1);
    expect(result[0].uniqueAlertsCount).toBe(0);
  });

  it('uniqueAlertsCount counts unique alert _ids; uniqueEventsCount counts unique non-alert _ids', () => {
    const records = [
      buildEventEsqlRow({ actorEntityId: 'user:alice', _id: 'evt-1', isAlert: false }),
      buildEventEsqlRow({ actorEntityId: 'user:alice', _id: 'evt-2', isAlert: false }),
      buildEventEsqlRow({ actorEntityId: 'user:alice', _id: 'evt-1', isAlert: false }), // dup
      buildEventEsqlRow({ actorEntityId: 'user:alice', _id: 'alert-1', isAlert: true }),
      buildEventEsqlRow({ actorEntityId: 'user:alice', _id: 'alert-1', isAlert: true }), // dup
    ];

    const result = regroupEvents(records, new Map());

    expect(result).toHaveLength(1);
    expect(result[0].uniqueEventsCount).toBe(2); // evt-1, evt-2
    expect(result[0].uniqueAlertsCount).toBe(1); // alert-1
    expect(result[0].badge).toBe(5); // total rows
    expect(result[0].isAlert).toBe(true); // at least one alert in group
  });

  it('deduplicates actorsDocData and targetsDocData when same entity appears across merged rows', () => {
    // Scenario: actor A acts on targets B and C (both host type).
    // ES|QL emits 2 per-triple rows: (A,B) and (A,C).
    // After re-grouping by (userType, hostType), they merge.
    // Actor A's docData should appear only ONCE, not twice.
    const actorDoc = '{"id":"user:alice","type":"entity","sourceFields":{}}';
    const targetBDoc = '{"id":"host:b","type":"entity","sourceFields":{}}';
    const targetCDoc = '{"id":"host:c","type":"entity","sourceFields":{}}';

    const record1 = buildEventEsqlRow({
      actorEntityId: 'user:alice',
      targetEntityId: 'host:b',
      actorDocData: actorDoc,
      targetDocData: targetBDoc,
    });
    const record2 = buildEventEsqlRow({
      actorEntityId: 'user:alice',
      targetEntityId: 'host:c',
      actorDocData: actorDoc,
      targetDocData: targetCDoc,
    });

    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      ['user:alice', { name: 'Alice', type: 'user', subType: null, engineType: null, hostIps: [] }],
      ['host:b', { name: 'B', type: 'host', subType: null, engineType: null, hostIps: [] }],
      ['host:c', { name: 'C', type: 'host', subType: null, engineType: null, hostIps: [] }],
    ]);

    const result = regroupEvents([record1, record2], enrichmentMap);

    expect(result).toHaveLength(1);
    const [group] = result;

    // actorsDocData: actor A appears in BOTH records but should be deduplicated to 1
    expect((group.actorsDocData as string[]).length).toBe(1);
    expect(group.actorsDocData).toContain(actorDoc);

    // targetsDocData: each target is unique, so both should be present
    expect((group.targetsDocData as string[]).length).toBe(2);
    expect(group.targetsDocData).toContain(targetBDoc);
    expect(group.targetsDocData).toContain(targetCDoc);
  });

  it('deduplicates docs when same document appears across merged rows', () => {
    const sharedDocData = '{"id":"shared-_id","type":"event","index":".alerts"}';
    const record1 = buildEventEsqlRow({
      actorEntityId: 'user:alice',
      targetEntityId: 'host:b',
      _id: 'shared-_id',
      docData: sharedDocData,
    });
    const record2 = buildEventEsqlRow({
      actorEntityId: 'user:alice',
      targetEntityId: 'host:c',
      _id: 'shared-_id',
      docData: sharedDocData,
    });

    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      ['user:alice', { name: 'Alice', type: 'user', subType: null, engineType: null, hostIps: [] }],
      ['host:b', { name: 'B', type: 'host', subType: null, engineType: null, hostIps: [] }],
      ['host:c', { name: 'C', type: 'host', subType: null, engineType: null, hostIps: [] }],
    ]);

    const result = regroupEvents([record1, record2], enrichmentMap);

    expect(result).toHaveLength(1);
    const [group] = result;

    // sharedDocData appears in both rows but should appear only once after dedup
    expect((group.docs as string[]).filter((d) => d === sharedDocData).length).toBe(1);
  });

  it('sorts groups by action DESC then pinned ASC then isOrigin DESC', () => {
    const recordA = buildEventEsqlRow({
      actorEntityId: 'user:alice',
      action: 'aaa-action',
      isOrigin: false,
      pinned: null,
    });
    const recordB = buildEventEsqlRow({
      actorEntityId: 'user:bob',
      action: 'zzz-action',
      isOrigin: true,
      pinned: null,
    });
    const recordC = buildEventEsqlRow({
      actorEntityId: 'user:charlie',
      action: 'mmm-action',
      isOrigin: false,
      pinned: 'user:charlie',
    });

    const result = regroupEvents([recordA, recordB, recordC], new Map());

    // 'zzz-action' DESC first, then 'mmm-action', then 'aaa-action'
    expect(result[0].action).toBe('zzz-action');
    expect(result[1].action).toBe('mmm-action');
    expect(result[2].action).toBe('aaa-action');
  });
});

describe('enrichEventDocData', () => {
  it('returns empty array for empty input', () => {
    const result = enrichEventDocData([], new Map());
    expect(result).toEqual([]);
  });

  it('rebuilds actorsDocData with availableInEntityStore=false when no enrichment', () => {
    const record = buildEventEsqlRow({
      actorEntityId: 'user:alice',
      targetEntityId: 'host:server1',
    });
    const grouped = regroupEvents([record], new Map());
    const result = enrichEventDocData(grouped, new Map());

    expect(result).toHaveLength(1);
    const [group] = result;

    const actorDoc = JSON.parse((group.actorsDocData as string[])[0]);
    expect(actorDoc.entity.availableInEntityStore).toBe(false);

    const targetDoc = JSON.parse((group.targetsDocData as string[])[0]);
    expect(targetDoc.entity.availableInEntityStore).toBe(false);
  });

  it('rebuilds actorsDocData with availableInEntityStore=true and metadata when enrichment found', () => {
    const record = buildEventEsqlRow({
      actorEntityId: 'user:alice',
      targetEntityId: 'host:server1',
    });
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      [
        'user:alice',
        { name: 'Alice', type: 'user', subType: 'admin', engineType: 'ecs', hostIps: [] },
      ],
    ]);

    const grouped = regroupEvents([record], enrichmentMap);
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
