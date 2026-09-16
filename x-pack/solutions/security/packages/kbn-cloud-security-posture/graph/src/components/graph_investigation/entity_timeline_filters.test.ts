/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { EntityNodeViewModel } from '../types';
import { getEntityTimelineFilter } from './entity_timeline_filters';

const createNode = (
  id: string,
  sourceFields?: Record<string, string | string[]>
): EntityNodeViewModel => ({
  id,
  color: 'primary',
  shape: 'rectangle',
  label: id,
  documentsData: [{ id, type: 'entity', entity: { sourceFields } }],
});

const getFilterDsl = (node: EntityNodeViewModel) => {
  const filter = getEntityTimelineFilter(node, 'data-view', euid);
  expect(filter).toBeDefined();
  return buildEsQuery(undefined, [], filter ? [filter] : []);
};

describe('getEntityTimelineFilter', () => {
  it('matches the raw host identity in either role without requiring the stored EUID', () => {
    const id = '7fe00fbe0365d3bfd00e00cc8cf0a00e';
    const dsl = getFilterDsl(
      createNode(`host:${id}`, { 'host.id': id, 'host.name': 'user-win2-dev' })
    );
    const serialized = JSON.stringify(dsl);

    expect(serialized).toContain(JSON.stringify({ match_phrase: { 'host.id': id } }));
    expect(serialized).toContain(JSON.stringify({ match_phrase: { 'host.target.id': id } }));
    expect(serialized).not.toContain('entity.id');
    expect(serialized).not.toContain(`host:${id}`);
    expect(serialized).not.toContain('host.name');
  });

  it('retains higher-ranked identity guards for a host resolved by name', () => {
    const serialized = JSON.stringify(getFilterDsl(createNode('host:web', { 'host.name': 'web' })));
    expect(serialized).toContain(JSON.stringify({ match_phrase: { 'host.name': 'web' } }));
    expect(serialized).toContain(JSON.stringify({ exists: { field: 'host.id' } }));
    expect(serialized).toContain(JSON.stringify({ exists: { field: 'host.target.id' } }));
    expect(serialized).toContain('must_not');
  });

  it('keeps all fields of a compound local user identity together', () => {
    const sourceFields = {
      'user.name': 'alice',
      'host.id': 'workstation',
      'event.module': 'system',
      'event.kind': 'event',
    };
    const id = euid.getEuidFromObjectForSearch('user', sourceFields);
    expect(id).toBeDefined();
    const serialized = JSON.stringify(getFilterDsl(createNode(id ?? '', sourceFields)));
    expect(serialized).toContain('user.name');
    expect(serialized).toContain('host.id');
    expect(serialized).toContain('user.target.name');
    expect(serialized).toContain('host.target.id');
    expect(serialized).not.toContain('entity.namespace');
    expect(serialized).not.toContain('entity.id');
  });

  it('uses the available identity building block when an entity node lacks namespace source fields', () => {
    const id = 'user:multi-actor-2@example.com@gcp';
    const serialized = JSON.stringify(
      getFilterDsl(createNode(id, { 'user.id': 'multi-actor-2@example.com' }))
    );

    expect(serialized).toContain(
      JSON.stringify({ match_phrase: { 'user.id': 'multi-actor-2@example.com' } })
    );
    expect(serialized).toContain(
      JSON.stringify({ match_phrase: { 'user.target.id': 'multi-actor-2@example.com' } })
    );
    expect(serialized).not.toContain(JSON.stringify({ exists: { field: 'user.email' } }));
    expect(serialized).not.toContain(JSON.stringify({ exists: { field: 'user.target.email' } }));
  });

  it('returns no filter when the node has no identity source fields', () => {
    expect(getEntityTimelineFilter(createNode('host:missing'), 'data-view', euid)).toBeUndefined();
  });
});
