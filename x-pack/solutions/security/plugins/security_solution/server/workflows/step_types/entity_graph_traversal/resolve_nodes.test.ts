/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraversalNode } from '../../../../common/workflows/step_types/entity_graph_traversal/entity_graph_traversal_common';
import type { EsqlResult } from './run_hop';
import {
  buildResolveQuery,
  resolveNodes,
  RESOLVE_QUERY_COLUMNS,
  type ExecuteResolveQuery,
} from './resolve_nodes';

const SEED = 'user:john.doe@acmecrm.com@okta';
const ROLE = 'arn:aws:iam::1:role/okta-prod-admin';
const BUCKET = 'arn:aws:s3:::acme-customer-pii';
const UNKNOWN = 'arn:aws:iam::2:role/CrossAccountAccessRole';
const INDEX = '.entities.v2.latest.default-*';

const nodes: TraversalNode[] = [
  { id: SEED, hop: 0, via: 'seed', type: 'user' },
  { id: ROLE, hop: 1, via: 'can_assume', type: 'role' },
  { id: UNKNOWN, hop: 2, via: 'can_assume', type: 'asset' },
  { id: BUCKET, hop: 3, via: 'grants_access_to', type: 'asset' },
];

const columns = RESOLVE_QUERY_COLUMNS.map((name) => ({ name, type: 'keyword' }));

const row = (
  id: string,
  overrides: Partial<Record<(typeof RESOLVE_QUERY_COLUMNS)[number], unknown>> = {}
): unknown[] =>
  RESOLVE_QUERY_COLUMNS.map((name) =>
    name === 'entity.id' ? id : overrides[name] === undefined ? null : overrides[name]
  );

const storeResult: EsqlResult = {
  columns,
  values: [
    row(SEED, {
      'entity.name': 'john.doe@acmecrm.com',
      'entity.type': 'Identity',
      'entity.EngineMetadata.Type': 'user',
      'entity.source': ['entityanalytics_okta', 'aws'],
      'entity.risk.calculated_level': 'High',
      'entity.risk.calculated_score_norm': 73.5,
    }),
    row(ROLE, {
      'entity.name': 'okta-prod-admin',
      'entity.type': 'Identity',
      'entity.sub_type': 'AWS IAM Role',
      'entity.EngineMetadata.Type': 'generic',
      'entity.source': 'cloud_asset_inventory.asset_inventory',
    }),
    row(BUCKET, {
      'entity.name': 'acme-customer-pii',
      'entity.type': 'Storage Bucket',
      'entity.sub_type': 'AWS S3 Bucket',
      'entity.EngineMetadata.Type': 'generic',
      'asset.criticality': 'extreme_impact',
      'entity.relationships.resolution.resolved_to': 'arn:aws:s3:::acme-customer-pii-golden',
    }),
  ],
};

describe('buildResolveQuery', () => {
  it('matches the ids as parameters and keeps the resolution columns', () => {
    const { query, params } = buildResolveQuery(INDEX, [SEED, ROLE]);

    expect(params).toEqual([SEED, ROLE]);
    expect(query).toBe(
      [
        'SET unmapped_fields="load";',
        `FROM ${INDEX}`,
        '| WHERE entity.id IN (?, ?)',
        `| KEEP ${RESOLVE_QUERY_COLUMNS.join(', ')}`,
        '| LIMIT 2',
      ].join('\n')
    );
  });

  it('refuses an empty id list', () => {
    expect(() => buildResolveQuery(INDEX, [])).toThrow('no ids');
  });
});

describe('resolveNodes', () => {
  it('annotates known nodes with the stored entity and marks the rest unresolved', async () => {
    const execute: ExecuteResolveQuery = jest.fn().mockResolvedValue(storeResult);

    const { nodes: resolved, stats } = await resolveNodes({ nodes, indexPattern: INDEX }, execute);

    expect(resolved.map((node) => node.id)).toEqual([SEED, ROLE, UNKNOWN, BUCKET]);
    expect(resolved[0]).toEqual({
      ...nodes[0],
      euid: SEED,
      resolved: true,
      entity: {
        name: 'john.doe@acmecrm.com',
        type: 'Identity',
        engine_type: 'user',
        sources: ['entityanalytics_okta', 'aws'],
        risk_level: 'High',
        risk_score: 73.5,
      },
    });
    expect(resolved[1].entity).toEqual({
      name: 'okta-prod-admin',
      type: 'Identity',
      sub_type: 'AWS IAM Role',
      engine_type: 'generic',
      sources: ['cloud_asset_inventory.asset_inventory'],
    });
    expect(resolved[2]).toEqual({ ...nodes[2], euid: UNKNOWN, resolved: false });
    expect(resolved[3]).toMatchObject({
      resolved: true,
      canonical_euid: 'arn:aws:s3:::acme-customer-pii-golden',
      entity: { criticality: 'extreme_impact', sub_type: 'AWS S3 Bucket' },
    });
    expect(stats).toEqual({ requested: 4, resolved: 3, unresolved: 1, aliases: 1, queries: 1 });
  });

  it('looks ids up in chunks, once per distinct id', async () => {
    const execute = jest.fn<Promise<EsqlResult>, [{ params: string[] }]>(async () => ({
      columns,
      values: [],
    }));

    const { stats } = await resolveNodes(
      { nodes: [...nodes, { ...nodes[1], hop: 4 }], indexPattern: INDEX, chunkSize: 3 },
      execute
    );

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[0][0].params).toEqual([SEED, ROLE, UNKNOWN]);
    expect(execute.mock.calls[1][0].params).toEqual([BUCKET]);
    expect(stats).toEqual({ requested: 5, resolved: 0, unresolved: 5, aliases: 0, queries: 2 });
  });

  it('runs no query for an empty node list', async () => {
    const execute = jest.fn();

    const result = await resolveNodes({ nodes: [], indexPattern: INDEX }, execute);

    expect(execute).not.toHaveBeenCalled();
    expect(result).toEqual({
      nodes: [],
      stats: { requested: 0, resolved: 0, unresolved: 0, aliases: 0, queries: 0 },
    });
  });

  it('fails when the result lacks the entity id column', async () => {
    const execute: ExecuteResolveQuery = async () => ({
      columns: [{ name: 'entity.name', type: 'keyword' }],
      values: [['x']],
    });

    await expect(resolveNodes({ nodes, indexPattern: INDEX }, execute)).rejects.toThrow(
      'entity.id'
    );
  });
});
