/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { Feature } from '@kbn/streams-schema';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import type { ResolutionClient } from '../../../domain/resolution';
import { runKiAutomatedResolution } from '../run';

const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn() } as unknown as Logger;

const makeFeature = (
  userName: string,
  userEmail: string,
  overrides: Partial<Feature> = {}
): Feature =>
  ({
    uuid: `uuid-${userName}-${userEmail}`,
    id: `user-${userName}`,
    stream_name: 'logs-windows.default',
    type: 'entity',
    subtype: 'user',
    title: userName,
    description: 'Endpoint user',
    properties: { identity_link: { user_name: userName, user_email: userEmail } },
    confidence: 95,
    evidence: [`user.name=${userName}`, `user.email=${userEmail}`],
    status: 'active',
    last_seen: '2026-06-10T00:00:00.000Z',
    ...overrides,
  } as Feature);

const makeReader = (features: Feature[]): StreamsKnowledgeIndicatorsReader => ({
  listEntityFeatures: jest.fn(async () => features),
  listDependencyFeatures: jest.fn(async () => []),
  listSchemaFeatures: jest.fn(async () => []),
  resolveIndexPatterns: jest.fn(async () => []),
});

interface FakeEntity {
  entityId: string;
  namespace: string;
  confidence: 'high' | 'medium';
  userName?: string;
  userEmail?: string;
}

const filterValue = (params: any, field: string): unknown => {
  const filters = params.query?.bool?.filter ?? [];
  for (const f of filters) {
    const term = f.term?.[field];
    if (term === undefined) continue;
    return typeof term === 'object' && term !== null && 'value' in term ? term.value : term;
  }
  return undefined;
};

interface FakeEsqlOpts {
  fields?: Record<string, unknown>;
  columns?: Array<{ name: string; type: string }>;
  values?: unknown[][];
}

const makeEsClient = (entities: FakeEntity[], esqlOpts: FakeEsqlOpts = {}): ElasticsearchClient => {
  const search = jest.fn(async (params: any) => {
    const confidence = filterValue(params, 'entity.confidence');
    const userName = filterValue(params, 'user.name');
    const userEmail = filterValue(params, 'user.email');

    const matches = entities.filter((e) => {
      if (e.confidence !== confidence) return false;
      if (userName !== undefined && e.userName?.toLowerCase() !== String(userName).toLowerCase()) {
        return false;
      }
      if (
        userEmail !== undefined &&
        e.userEmail?.toLowerCase() !== String(userEmail).toLowerCase()
      ) {
        return false;
      }
      return true;
    });

    return {
      hits: {
        hits: matches.map((e) => ({
          _source: { 'entity.id': e.entityId, 'entity.namespace': e.namespace },
        })),
      },
    };
  });

  // Deterministic rule path (only exercised when useRules is true).
  const fieldCaps = jest.fn(async () => ({
    fields: esqlOpts.fields ?? {
      'user.name': { keyword: {} },
      'github.external_identity_nameid': { keyword: {} },
    },
  }));
  const query = jest.fn(async () => ({
    columns: esqlOpts.columns ?? [
      { name: 'doc_count', type: 'long' },
      { name: 'user_name', type: 'keyword' },
      { name: 'user_email', type: 'keyword' },
    ],
    values: esqlOpts.values ?? [],
  }));

  return { search, fieldCaps, esql: { query } } as unknown as ElasticsearchClient;
};

const makeResolutionClient = () =>
  ({
    linkEntities: jest.fn(async (targetId: string, ids: string[]) => ({
      linked: ids,
      skipped: [],
      target_id: targetId,
    })),
  } as unknown as ResolutionClient & { linkEntities: jest.Mock });

const baseDeps = () => ({
  state: { lastRun: null },
  namespace: 'default',
  logger,
  minConfidence: 90,
  resolveIdpToIdp: false,
  useRules: false,
  telemetry: { report: jest.fn() },
  abortController: new AbortController(),
});

describe('runKiAutomatedResolution', () => {
  beforeEach(() => jest.clearAllMocks());

  it('links a medium candidate to the high IdP target (primary success metric)', async () => {
    const reader = makeReader([makeFeature('jdoe', 'john.doe@corp.com')]);
    const esClient = makeEsClient([
      {
        entityId: 'user:jdoe@host1@local',
        namespace: 'local',
        confidence: 'medium',
        userName: 'jdoe',
      },
      {
        entityId: 'user:john.doe@corp.com@okta',
        namespace: 'okta',
        confidence: 'high',
        userEmail: 'john.doe@corp.com',
      },
    ]);
    const resolutionClient = makeResolutionClient();

    const result = await runKiAutomatedResolution({
      ...baseDeps(),
      esClient,
      resolutionClient,
      reader,
    });

    expect(resolutionClient.linkEntities).toHaveBeenCalledWith('user:john.doe@corp.com@okta', [
      'user:jdoe@host1@local',
    ]);
    expect(result.lastRun).toMatchObject({ cluesLoaded: 1, resolutionsCreated: 1, failed: 0 });
  });

  it('links every medium candidate (multiple hosts) to the same target', async () => {
    const reader = makeReader([makeFeature('jdoe', 'john.doe@corp.com')]);
    const esClient = makeEsClient([
      {
        entityId: 'user:jdoe@host1@local',
        namespace: 'local',
        confidence: 'medium',
        userName: 'jdoe',
      },
      {
        entityId: 'user:jdoe@host2@local',
        namespace: 'local',
        confidence: 'medium',
        userName: 'jdoe',
      },
      {
        entityId: 'user:john.doe@corp.com@okta',
        namespace: 'okta',
        confidence: 'high',
        userEmail: 'john.doe@corp.com',
      },
    ]);
    const resolutionClient = makeResolutionClient();

    const result = await runKiAutomatedResolution({
      ...baseDeps(),
      esClient,
      resolutionClient,
      reader,
    });

    expect(resolutionClient.linkEntities).toHaveBeenCalledWith('user:john.doe@corp.com@okta', [
      'user:jdoe@host1@local',
      'user:jdoe@host2@local',
    ]);
    expect(result.lastRun?.resolutionsCreated).toBe(2);
  });

  it('skips an ambiguous username (one token mapped to multiple emails)', async () => {
    const reader = makeReader([
      makeFeature('jdoe', 'john.doe@corp.com', { uuid: 'a' }),
      makeFeature('jdoe', 'jane.doe@corp.com', { uuid: 'b' }),
    ]);
    const esClient = makeEsClient([]);
    const resolutionClient = makeResolutionClient();

    const result = await runKiAutomatedResolution({
      ...baseDeps(),
      esClient,
      resolutionClient,
      reader,
    });

    expect(resolutionClient.linkEntities).not.toHaveBeenCalled();
    expect(result.lastRun).toMatchObject({ skippedAmbiguous: 1, resolutionsCreated: 0 });
  });

  it('skips when no high-confidence target matches the email', async () => {
    const reader = makeReader([makeFeature('jdoe', 'john.doe@corp.com')]);
    const esClient = makeEsClient([
      {
        entityId: 'user:jdoe@host1@local',
        namespace: 'local',
        confidence: 'medium',
        userName: 'jdoe',
      },
    ]);
    const resolutionClient = makeResolutionClient();

    const result = await runKiAutomatedResolution({
      ...baseDeps(),
      esClient,
      resolutionClient,
      reader,
    });

    expect(resolutionClient.linkEntities).not.toHaveBeenCalled();
    expect(result.lastRun).toMatchObject({ skippedNoTarget: 1, resolutionsCreated: 0 });
  });

  it('skips when no medium candidate matches the username', async () => {
    const reader = makeReader([makeFeature('jdoe', 'john.doe@corp.com')]);
    const esClient = makeEsClient([
      {
        entityId: 'user:john.doe@corp.com@okta',
        namespace: 'okta',
        confidence: 'high',
        userEmail: 'john.doe@corp.com',
      },
    ]);
    const resolutionClient = makeResolutionClient();

    const result = await runKiAutomatedResolution({
      ...baseDeps(),
      esClient,
      resolutionClient,
      reader,
    });

    expect(resolutionClient.linkEntities).not.toHaveBeenCalled();
    expect(result.lastRun).toMatchObject({ skippedNoCandidate: 1, resolutionsCreated: 0 });
  });

  it('is a no-op when all KI features are below the confidence floor', async () => {
    const reader = makeReader([makeFeature('jdoe', 'john.doe@corp.com', { confidence: 50 })]);
    const esClient = makeEsClient([
      {
        entityId: 'user:jdoe@host1@local',
        namespace: 'local',
        confidence: 'medium',
        userName: 'jdoe',
      },
      {
        entityId: 'user:john.doe@corp.com@okta',
        namespace: 'okta',
        confidence: 'high',
        userEmail: 'john.doe@corp.com',
      },
    ]);
    const resolutionClient = makeResolutionClient();

    const result = await runKiAutomatedResolution({
      ...baseDeps(),
      esClient,
      resolutionClient,
      reader,
    });

    expect(resolutionClient.linkEntities).not.toHaveBeenCalled();
    expect(result.lastRun).toMatchObject({ cluesLoaded: 0, resolutionsCreated: 0 });
  });

  it('picks the IdP-priority target when several high targets share the email', async () => {
    const reader = makeReader([makeFeature('jdoe', 'john.doe@corp.com')]);
    const esClient = makeEsClient([
      {
        entityId: 'user:jdoe@host1@local',
        namespace: 'local',
        confidence: 'medium',
        userName: 'jdoe',
      },
      {
        entityId: 'user:john.doe@corp.com@okta',
        namespace: 'okta',
        confidence: 'high',
        userEmail: 'john.doe@corp.com',
      },
      {
        entityId: 'user:john.doe@corp.com@active_directory',
        namespace: 'active_directory',
        confidence: 'high',
        userEmail: 'john.doe@corp.com',
      },
    ]);
    const resolutionClient = makeResolutionClient();

    await runKiAutomatedResolution({ ...baseDeps(), esClient, resolutionClient, reader });

    // selectTarget prioritizes active_directory over okta.
    expect(resolutionClient.linkEntities).toHaveBeenCalledWith(
      'user:john.doe@corp.com@active_directory',
      ['user:jdoe@host1@local']
    );
  });

  describe('IdP -> IdP (cross-namespace)', () => {
    it('links a lower-priority IdP candidate (github) to the higher-priority target when enabled', async () => {
      const reader = makeReader([makeFeature('jdoe', 'john.doe@corp.com')]);
      const esClient = makeEsClient([
        {
          entityId: 'user:jdoe@github',
          namespace: 'github',
          confidence: 'high',
          userName: 'jdoe',
        },
        {
          entityId: 'user:john.doe@corp.com@okta',
          namespace: 'okta',
          confidence: 'high',
          userEmail: 'john.doe@corp.com',
        },
      ]);
      const resolutionClient = makeResolutionClient();

      const result = await runKiAutomatedResolution({
        ...baseDeps(),
        resolveIdpToIdp: true,
        esClient,
        resolutionClient,
        reader,
      });

      expect(resolutionClient.linkEntities).toHaveBeenCalledWith('user:john.doe@corp.com@okta', [
        'user:jdoe@github',
      ]);
      expect(result.lastRun).toMatchObject({ resolutionsCreated: 1, idpResolutionsCreated: 1 });
    });

    it('does NOT link the IdP candidate when the sub-flag is off', async () => {
      const reader = makeReader([makeFeature('jdoe', 'john.doe@corp.com')]);
      const esClient = makeEsClient([
        { entityId: 'user:jdoe@github', namespace: 'github', confidence: 'high', userName: 'jdoe' },
        {
          entityId: 'user:john.doe@corp.com@okta',
          namespace: 'okta',
          confidence: 'high',
          userEmail: 'john.doe@corp.com',
        },
      ]);
      const resolutionClient = makeResolutionClient();

      const result = await runKiAutomatedResolution({
        ...baseDeps(),
        resolveIdpToIdp: false,
        esClient,
        resolutionClient,
        reader,
      });

      expect(resolutionClient.linkEntities).not.toHaveBeenCalled();
      expect(result.lastRun).toMatchObject({ skippedNoCandidate: 1, idpResolutionsCreated: 0 });
    });

    it('skips a higher-priority candidate (wrong direction) and never demotes it', async () => {
      const reader = makeReader([makeFeature('jdoe', 'john.doe@corp.com')]);
      const esClient = makeEsClient([
        // AD matches by user.name but NOT by the clue email; it ranks above okta.
        {
          entityId: 'user:jdoe@active_directory',
          namespace: 'active_directory',
          confidence: 'high',
          userName: 'jdoe',
        },
        {
          entityId: 'user:john.doe@corp.com@okta',
          namespace: 'okta',
          confidence: 'high',
          userEmail: 'john.doe@corp.com',
        },
      ]);
      const resolutionClient = makeResolutionClient();

      const result = await runKiAutomatedResolution({
        ...baseDeps(),
        resolveIdpToIdp: true,
        esClient,
        resolutionClient,
        reader,
      });

      expect(resolutionClient.linkEntities).not.toHaveBeenCalled();
      expect(result.lastRun).toMatchObject({
        skippedWrongDirection: 1,
        skippedNoCandidate: 1,
        idpResolutionsCreated: 0,
      });
    });

    it('skips a same-namespace candidate (equal rank, dedup is out of scope)', async () => {
      const reader = makeReader([makeFeature('jdoe', 'john.doe@corp.com')]);
      const esClient = makeEsClient([
        { entityId: 'user:jdoe@okta', namespace: 'okta', confidence: 'high', userName: 'jdoe' },
        {
          entityId: 'user:john.doe@corp.com@okta',
          namespace: 'okta',
          confidence: 'high',
          userEmail: 'john.doe@corp.com',
        },
      ]);
      const resolutionClient = makeResolutionClient();

      const result = await runKiAutomatedResolution({
        ...baseDeps(),
        resolveIdpToIdp: true,
        esClient,
        resolutionClient,
        reader,
      });

      expect(resolutionClient.linkEntities).not.toHaveBeenCalled();
      expect(result.lastRun).toMatchObject({ skippedWrongDirection: 1, idpResolutionsCreated: 0 });
    });

    it('links medium and IdP candidates together to the same target', async () => {
      const reader = makeReader([makeFeature('jdoe', 'john.doe@corp.com')]);
      const esClient = makeEsClient([
        {
          entityId: 'user:jdoe@host1@local',
          namespace: 'local',
          confidence: 'medium',
          userName: 'jdoe',
        },
        { entityId: 'user:jdoe@github', namespace: 'github', confidence: 'high', userName: 'jdoe' },
        {
          entityId: 'user:john.doe@corp.com@okta',
          namespace: 'okta',
          confidence: 'high',
          userEmail: 'john.doe@corp.com',
        },
      ]);
      const resolutionClient = makeResolutionClient();

      const result = await runKiAutomatedResolution({
        ...baseDeps(),
        resolveIdpToIdp: true,
        esClient,
        resolutionClient,
        reader,
      });

      expect(resolutionClient.linkEntities).toHaveBeenCalledWith('user:john.doe@corp.com@okta', [
        'user:jdoe@host1@local',
        'user:jdoe@github',
      ]);
      expect(result.lastRun).toMatchObject({ resolutionsCreated: 2, idpResolutionsCreated: 1 });
    });
  });

  describe('deterministic rule path (useRules)', () => {
    const makeRuleFeature = (): Feature =>
      makeFeature('opauloh', 'unused@corp.com', {
        uuid: 'rule-1',
        stream_name: 'logs-github.audit-default',
        // Only a rule, no per-user identity_link, so the per-user loader yields nothing.
        properties: {
          identity_link_rule: {
            user_name_field: 'user.name',
            user_email_field: 'github.external_identity_nameid',
          },
        },
      });

    it('does not query the deterministic path when useRules is false', async () => {
      const reader = makeReader([makeFeature('jdoe', 'john.doe@corp.com')]);
      const esClient = makeEsClient([]);
      const resolutionClient = makeResolutionClient();

      const result = await runKiAutomatedResolution({
        ...baseDeps(),
        useRules: false,
        esClient,
        resolutionClient,
        reader,
      });

      expect(esClient.esql.query as jest.Mock).not.toHaveBeenCalled();
      expect(result.lastRun).toMatchObject({ rulesLoaded: 0, deterministicCluesExtracted: 0 });
    });

    it('materializes a clue from a rule and links the github entity to the okta target', async () => {
      const reader = makeReader([makeRuleFeature()]);
      (reader.resolveIndexPatterns as jest.Mock).mockResolvedValue(['logs-github.audit-default']);

      const esClient = makeEsClient(
        [
          {
            entityId: 'user:opauloh@github',
            namespace: 'github',
            confidence: 'high',
            userName: 'opauloh',
          },
          {
            entityId: 'user:paulo@elastic.co@okta',
            namespace: 'okta',
            confidence: 'high',
            userEmail: 'paulo@elastic.co',
          },
        ],
        { values: [[5, 'opauloh', 'paulo@elastic.co']] }
      );
      const resolutionClient = makeResolutionClient();

      const result = await runKiAutomatedResolution({
        ...baseDeps(),
        useRules: true,
        resolveIdpToIdp: true,
        esClient,
        resolutionClient,
        reader,
      });

      expect(resolutionClient.linkEntities).toHaveBeenCalledWith('user:paulo@elastic.co@okta', [
        'user:opauloh@github',
      ]);
      expect(result.lastRun).toMatchObject({
        rulesLoaded: 1,
        deterministicCluesExtracted: 1,
        resolutionsCreated: 1,
        idpResolutionsCreated: 1,
      });
    });
  });
});
