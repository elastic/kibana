/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { API_VERSIONS } from '../../../../common';
import {
  paramsSchema,
  querySchema,
  registerListRelationships,
  type RelationshipRecord,
} from './list_relationships';
import type { RelationshipMetadataDoc } from '../../../../common/domain/entity_metadata/relationship_metadata';

const makeDoc = (overrides: Partial<RelationshipMetadataDoc> = {}): RelationshipMetadataDoc =>
  ({
    '@timestamp': '2026-05-15T10:30:00.000Z',
    'event.kind': 'event',
    'event.action': 'relationship_observed',
    'entity.id': 'user:alice@corp',
    'entity.source': 'elastic_defend',
    'entity.relationships.accesses_frequently.target': 'host:laptopA',
    'related.user': ['alice'],
    'related.hosts': ['laptopA'],
    Maintainer: {
      kind: 'accesses_frequently_and_infrequently',
      scan_id: 'scan-1',
      lookback_window: 'now-30d',
    },
    ...overrides,
  } as RelationshipMetadataDoc);

const createMockContext = (overrides?: { listResult?: unknown }) => {
  const listRelationshipMetadata = jest
    .fn()
    .mockResolvedValue(overrides?.listResult ?? { records: [], total: 0, page: 1, per_page: 10 });
  const featureFlags = {
    isEntityStoreV2Enabled: jest.fn().mockResolvedValue(true),
  };
  const entityStoreCtx = {
    logger: loggerMock.create(),
    crudClient: { listRelationshipMetadata },
    featureFlags,
    namespace: 'default',
  };
  // Mock context only needs the fields the route + middleware pipeline read;
  // typed loosely to match the existing middleware-test pattern.
  const ctx: any = { entityStore: Promise.resolve(entityStoreCtx) };
  return { ctx, listRelationshipMetadata, featureFlags };
};

describe('registerListRelationships route', () => {
  let router: ReturnType<typeof mockRouter.create>;

  beforeEach(() => {
    router = mockRouter.create();
  });

  it('registers the route at /api/security/entity_store/entities/{entityId}/relationships', () => {
    registerListRelationships(router);
    const [config] = (router.versioned.get as jest.Mock).mock.calls[0];
    expect(config.path).toBe('/api/security/entity_store/entities/{entityId}/relationships');
  });

  it('declares the route as public access', () => {
    registerListRelationships(router);
    const [config] = (router.versioned.get as jest.Mock).mock.calls[0];
    expect(config.access).toBe('public');
  });

  it('registers a single versioned handler under API_VERSIONS.public.v1', () => {
    registerListRelationships(router);
    const route = (router.versioned.get as jest.Mock).mock.results[0].value;
    const [versionConfig] = (route.addVersion as jest.Mock).mock.calls[0];
    expect(versionConfig.version).toBe(API_VERSIONS.public.v1);
  });

  it('rejects an empty entityId path param', () => {
    // Schema is the contract; the route wrapper (buildRouteValidationWithZod)
    // is plumbing. Test the schema directly.
    expect(paramsSchema.safeParse({ entityId: '' }).success).toBe(false);
  });

  it('accepts a non-empty entityId path param', () => {
    expect(paramsSchema.safeParse({ entityId: 'user:alice@corp' }).success).toBe(true);
  });

  it('validates the query schema and rejects invalid sort_order', () => {
    expect(querySchema.safeParse({ sort_order: 'sideways' }).success).toBe(false);
  });

  it('rejects an invalid ISO-8601 `from` query param', () => {
    expect(querySchema.safeParse({ from: 'not-a-date' }).success).toBe(false);
  });

  it('accepts an empty query object (all params optional)', () => {
    expect(querySchema.safeParse({}).success).toBe(true);
  });

  it('forwards entityId + query params to crudClient.listRelationshipMetadata', async () => {
    registerListRelationships(router);
    const route = (router.versioned.get as jest.Mock).mock.results[0].value;
    const [, handler] = (route.addVersion as jest.Mock).mock.calls[0];

    const { ctx, listRelationshipMetadata } = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { entityId: 'user:alice@corp' },
      query: {
        kind: 'communicates_with',
        from: '2026-04-27T00:00:00.000Z',
        per_page: 25,
        page: 2,
      },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(ctx, req, res);

    expect(listRelationshipMetadata).toHaveBeenCalledTimes(1);
    const params = listRelationshipMetadata.mock.calls[0][0];
    expect(params).toMatchObject({
      entityId: 'user:alice@corp',
      kind: 'communicates_with',
      from: '2026-04-27T00:00:00.000Z',
      per_page: 25,
      page: 2,
    });
  });

  it('returns normalized records (kind, target, timestamp, source)', async () => {
    registerListRelationships(router);
    const route = (router.versioned.get as jest.Mock).mock.results[0].value;
    const [, handler] = (route.addVersion as jest.Mock).mock.calls[0];

    const doc = makeDoc({ '@timestamp': '2026-05-01T00:00:00.000Z' });
    const { ctx } = createMockContext({
      listResult: { records: [doc], total: 1, page: 1, per_page: 10 },
    });

    const req = httpServerMock.createKibanaRequest({
      params: { entityId: 'user:alice@corp' },
      query: {},
    });
    const res = httpServerMock.createResponseFactory();

    await handler(ctx, req, res);

    expect(res.ok).toHaveBeenCalledTimes(1);
    const body = res.ok.mock.calls[0][0]?.body as {
      records: RelationshipRecord[];
      total: number;
      page: number;
      per_page: number;
    };
    expect(body.records).toEqual([
      {
        kind: 'accesses_frequently',
        target: 'host:laptopA',
        timestamp: '2026-05-01T00:00:00.000Z',
        source: 'elastic_defend',
      },
    ]);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.per_page).toBe(10);
  });

  it('returns an empty records array when no records match', async () => {
    registerListRelationships(router);
    const route = (router.versioned.get as jest.Mock).mock.results[0].value;
    const [, handler] = (route.addVersion as jest.Mock).mock.calls[0];

    const { ctx } = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { entityId: 'user:alice@corp' },
      query: {},
    });
    const res = httpServerMock.createResponseFactory();

    await handler(ctx, req, res);

    expect(res.ok).toHaveBeenCalledTimes(1);
    const body = res.ok.mock.calls[0][0]?.body as { records: unknown[] };
    expect(body.records).toEqual([]);
  });
});
