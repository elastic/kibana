/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ENTITY_ID_LENGTH,
  MAX_ENTITY_NAME_LENGTH,
} from '@kbn/agentic-investigations-plugin/common';
import type { AttachmentEntityRef } from '../../../../../common/attachment_entity';
import { buildImpactEntities, MAX_HUNT_IMPACT_ENTITIES } from './build_impact_entities';

const entry = (entities: AttachmentEntityRef[]) => ({ data: { entities } });

describe('buildImpactEntities', () => {
  it('maps host and user fields to typed, prefixed impact entities', () => {
    expect(
      buildImpactEntities([
        entry([
          { field: 'host.name', value: 'WIN-01' },
          { field: 'host.hostname', value: 'mac-02' },
          { field: 'user.name', value: 'james' },
        ]),
      ])
    ).toEqual([
      { id: 'host:WIN-01', name: 'WIN-01', type: 'host' },
      { id: 'host:mac-02', name: 'mac-02', type: 'host' },
      { id: 'user:james', name: 'james', type: 'user' },
    ]);
  });

  it('skips service.name and the id-style fields the mapper does not use for impact', () => {
    expect(
      buildImpactEntities([
        entry([
          { field: 'service.name', value: 'arn:aws:iam::1:role/deploy' },
          { field: 'service.id', value: 'svc-1' },
          { field: 'host.id', value: 'abc' },
          { field: 'user.id', value: 'S-1-5-21' },
          { field: 'user.email', value: 'james@example.com' },
        ]),
      ])
    ).toEqual([]);
  });

  it('dedupes across SSE entries and across host.name / host.hostname, keeping first-seen order', () => {
    expect(
      buildImpactEntities([
        entry([
          { field: 'host.name', value: 'WIN-01' },
          { field: 'user.name', value: 'james' },
        ]),
        entry([
          { field: 'host.hostname', value: 'WIN-01' },
          { field: 'user.name', value: 'james' },
          { field: 'user.name', value: 'maria' },
        ]),
      ]).map((entity) => entity.id)
    ).toEqual(['host:WIN-01', 'user:james', 'user:maria']);
  });

  it('keeps a host and a user that share a name apart', () => {
    expect(
      buildImpactEntities([
        entry([
          { field: 'host.name', value: 'admin' },
          { field: 'user.name', value: 'admin' },
        ]),
      ]).map((entity) => entity.id)
    ).toEqual(['host:admin', 'user:admin']);
  });

  it('cuts the id to the shared id limit and the name to the shared name limit', () => {
    const longValue = 'x'.repeat(2048);
    const [entity] = buildImpactEntities([entry([{ field: 'user.name', value: longValue }])]);

    expect(entity.id).toHaveLength(MAX_ENTITY_ID_LENGTH);
    expect(entity.id.startsWith('user:x')).toBe(true);
    expect(entity.name).toHaveLength(MAX_ENTITY_NAME_LENGTH);
  });

  it('caps the list at half the per-Investigation limit, keeping the earliest entities', () => {
    const hosts = Array.from({ length: 40 }, (_, i) => ({
      field: 'host.name' as const,
      value: `host-${i}`,
    }));
    const users = Array.from({ length: 40 }, (_, i) => ({
      field: 'user.name' as const,
      value: `user-${i}`,
    }));

    const entities = buildImpactEntities([entry(hosts), entry(users)]);

    expect(MAX_HUNT_IMPACT_ENTITIES).toBe(50);
    expect(entities).toHaveLength(MAX_HUNT_IMPACT_ENTITIES);
    expect(entities[0].id).toBe('host:host-0');
    expect(entities[39].id).toBe('host:host-39');
    expect(entities[49].id).toBe('user:user-9');
  });

  it('returns an empty list when there are no SSE entries', () => {
    expect(buildImpactEntities([])).toEqual([]);
  });

  it('skips an entity with an empty name, which the impact route would otherwise reject', () => {
    expect(
      buildImpactEntities([
        entry([
          { field: 'host.name', value: '' },
          { field: 'user.name', value: 'james' },
        ]),
      ])
    ).toEqual([{ id: 'user:james', name: 'james', type: 'user' }]);
  });

  it('keeps two over-long values apart even when they share a long common prefix', () => {
    const sharedPrefix = 'x'.repeat(300);
    const nameA = `${sharedPrefix}-A`;
    const nameB = `${sharedPrefix}-B`;

    const entities = buildImpactEntities([
      entry([
        { field: 'user.name', value: nameA },
        { field: 'user.name', value: nameB },
      ]),
    ]);

    expect(entities).toHaveLength(2);
    expect(entities[0].id).not.toBe(entities[1].id);
    expect(entities[0].id).toHaveLength(MAX_ENTITY_ID_LENGTH);
    expect(entities[1].id).toHaveLength(MAX_ENTITY_ID_LENGTH);
  });
});
