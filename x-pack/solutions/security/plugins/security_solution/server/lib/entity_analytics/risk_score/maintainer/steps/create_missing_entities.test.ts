/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import type { EntityRiskScoreRecord } from '../../../../../../common/api/entity_analytics/common';
import { createMissingEntities } from './create_missing_entities';
import type { ScopedLogger } from '../utils/with_log_context';

const buildLogger = (): ScopedLogger =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as ScopedLogger);

const buildScore = (
  idValue: string,
  overrides: Partial<EntityRiskScoreRecord> = {}
): EntityRiskScoreRecord =>
  ({
    '@timestamp': '2026-01-01T00:00:00.000Z',
    id_field: 'entity.id',
    id_value: idValue,
    calculated_level: 'Low',
    calculated_score: 21.5,
    calculated_score_norm: 21.5,
    category_1_score: 21.5,
    category_1_count: 1,
    notes: [],
    inputs: [],
    ...overrides,
  } as unknown as EntityRiskScoreRecord);

// Mocks a `by_entity_id` terms+top_hits aggregation response for fetchAlertIdentityDocs.
const mockAlertDocsResponse = (
  esClient: ElasticsearchClient,
  docsByEuid: Record<string, Record<string, unknown>>
) => {
  (esClient.search as jest.Mock).mockResolvedValueOnce({
    aggregations: {
      by_entity_id: {
        buckets: Object.entries(docsByEuid).map(([key, source]) => ({
          key,
          latest: { hits: { hits: [{ _source: source }] } },
        })),
      },
    },
  });
};

describe('createMissingEntities', () => {
  let esClient: ElasticsearchClient;
  let crudClient: EntityUpdateClient;
  let logger: ScopedLogger;

  const baseParams = {
    entityType: EntityType.user,
    alertsIndex: '.alerts-security.alerts-default',
    alertFilters: [],
  };

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    crudClient = { createEntitiesFromSource: jest.fn() } as unknown as EntityUpdateClient;
    logger = buildLogger();
  });

  it('returns an empty result without any calls when there are no missing scores', async () => {
    const result = await createMissingEntities({
      esClient,
      crudClient,
      logger,
      ...baseParams,
      missingScores: [],
    });

    expect(result).toEqual({
      created: [],
      alreadyExists: [],
      rejectedCount: 0,
      rejectedByReason: {},
    });
    expect(esClient.search).not.toHaveBeenCalled();
    expect(crudClient.createEntitiesFromSource).not.toHaveBeenCalled();
  });

  it('counts scores with no representative alert document as rejected without calling the CRUD client', async () => {
    mockAlertDocsResponse(esClient, {});

    const result = await createMissingEntities({
      esClient,
      crudClient,
      logger,
      ...baseParams,
      missingScores: [buildScore('user:phantom@host1@local')],
    });

    expect(result.rejectedCount).toBe(1);
    expect(result.rejectedByReason).toEqual({ no_alert_document: 1 });
    expect(crudClient.createEntitiesFromSource).not.toHaveBeenCalled();
  });

  it('forwards a create request per resolved document with the risk fields and provenance stamp', async () => {
    const source = { user: { name: 'alice' }, host: { id: 'host-1' } };
    mockAlertDocsResponse(esClient, { 'user:alice@host-1@local': source });
    (crudClient.createEntitiesFromSource as jest.Mock).mockResolvedValue({
      created: ['user:alice@host-1@local'],
      alreadyExists: [],
      rejected: [],
    });

    const score = buildScore('user:alice@host-1@local', {
      calculated_level: 'High',
      calculated_score: 80,
      calculated_score_norm: 80,
    });

    const result = await createMissingEntities({
      esClient,
      crudClient,
      logger,
      ...baseParams,
      missingScores: [score],
    });

    expect(crudClient.createEntitiesFromSource).toHaveBeenCalledWith([
      {
        type: EntityType.user,
        source,
        createdBy: 'risk_score_maintainer',
        fields: {
          'entity.risk.calculated_level': 'High',
          'entity.risk.calculated_score': 80,
          'entity.risk.calculated_score_norm': 80,
        },
      },
    ]);
    expect(result.created).toEqual(['user:alice@host-1@local']);
    expect(result.rejectedCount).toBe(0);
  });

  it('surfaces already-exists ids from a bulk-create race separately from created ids', async () => {
    mockAlertDocsResponse(esClient, {
      'user:a@host1@local': { user: { name: 'a' }, host: { id: 'host1' } },
      'user:b@host2@local': { user: { name: 'b' }, host: { id: 'host2' } },
    });
    (crudClient.createEntitiesFromSource as jest.Mock).mockResolvedValue({
      created: ['user:a@host1@local'],
      alreadyExists: ['user:b@host2@local'],
      rejected: [],
    });

    const result = await createMissingEntities({
      esClient,
      crudClient,
      logger,
      ...baseParams,
      missingScores: [buildScore('user:a@host1@local'), buildScore('user:b@host2@local')],
    });

    expect(result.created).toEqual(['user:a@host1@local']);
    expect(result.alreadyExists).toEqual(['user:b@host2@local']);
    expect(result.rejectedCount).toBe(0);
  });

  it('aggregates policy-rejected candidates by reason', async () => {
    mockAlertDocsResponse(esClient, {
      'user:idp@okta': { user: { name: 'idp' }, event: { module: 'okta' } },
    });
    (crudClient.createEntitiesFromSource as jest.Mock).mockResolvedValue({
      created: [],
      alreadyExists: [],
      rejected: [{ reason: 'user_not_local_namespace' }],
    });

    const result = await createMissingEntities({
      esClient,
      crudClient,
      logger,
      ...baseParams,
      missingScores: [buildScore('user:idp@okta')],
    });

    expect(result.created).toEqual([]);
    expect(result.rejectedCount).toBe(1);
    expect(result.rejectedByReason).toEqual({ user_not_local_namespace: 1 });
  });

  it('combines no_alert_document rejections with policy rejections from the CRUD client', async () => {
    mockAlertDocsResponse(esClient, {
      'user:idp@okta': { user: { name: 'idp' } },
    });
    (crudClient.createEntitiesFromSource as jest.Mock).mockResolvedValue({
      created: [],
      alreadyExists: [],
      rejected: [{ reason: 'user_not_local_namespace' }],
    });

    const result = await createMissingEntities({
      esClient,
      crudClient,
      logger,
      ...baseParams,
      missingScores: [buildScore('user:idp@okta'), buildScore('user:no-doc@host1@local')],
    });

    expect(result.rejectedCount).toBe(2);
    expect(result.rejectedByReason).toEqual({
      no_alert_document: 1,
      user_not_local_namespace: 1,
    });
  });
});
