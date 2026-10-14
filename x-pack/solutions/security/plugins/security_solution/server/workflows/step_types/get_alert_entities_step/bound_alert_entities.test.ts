/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boundAlertEntities } from './bound_alert_entities';
import type { FoundAlertEntity } from './types';

const host = (id: string, count: number, name?: string): FoundAlertEntity => ({
  count,
  id,
  name,
  type: 'host',
});
const user = (id: string, count: number, name?: string): FoundAlertEntity => ({
  count,
  id,
  name,
  type: 'user',
});

describe('boundAlertEntities', () => {
  it('merges the types, most-alerted first', () => {
    expect(
      boundAlertEntities({
        found: [
          { entities: [host('host:a', 2, 'A'), host('host:b', 5, 'B')], total: 2 },
          { entities: [user('user:c@a@local', 3, 'c@A')], total: 1 },
        ],
        maxEntities: 10,
      })
    ).toEqual({
      entities: [
        { id: 'host:b', name: 'B', type: 'host' },
        { id: 'user:c@a@local', name: 'c@A', type: 'user' },
        { id: 'host:a', name: 'A', type: 'host' },
      ],
      total: 3,
      truncated: false,
    });
  });

  it('breaks ties by id', () => {
    expect(
      boundAlertEntities({
        found: [{ entities: [host('host:b', 1), host('host:a', 1), user('user:a', 1)], total: 3 }],
        maxEntities: 10,
      }).entities.map(({ id }) => id)
    ).toEqual(['host:a', 'host:b', 'user:a']);
  });

  it('keeps the most-alerted entities across types when over the cap, and says so', () => {
    expect(
      boundAlertEntities({
        found: [
          { entities: [host('host:a', 9), host('host:b', 1)], total: 2 },
          { entities: [user('user:c', 5), user('user:d', 4)], total: 2 },
        ],
        maxEntities: 2,
      })
    ).toEqual({
      entities: [
        { id: 'host:a', type: 'host' },
        { id: 'user:c', type: 'user' },
      ],
      total: 4,
      truncated: true,
    });
  });

  it('leaves the name off an entity that has none', () => {
    const [entity] = boundAlertEntities({
      found: [{ entities: [host('host:a', 1, undefined)], total: 1 }],
      maxEntities: 10,
    }).entities;

    expect('name' in entity).toBe(false);
  });

  it('drops an id over 256 characters', () => {
    const tooLong = `host:${'a'.repeat(252)}`;
    const atLimit = `host:${'b'.repeat(251)}`;

    expect(
      boundAlertEntities({
        found: [{ entities: [host(tooLong, 9), host(atLimit, 1)], total: 2 }],
        maxEntities: 10,
      }).entities.map(({ id }) => id)
    ).toEqual([atLimit]);
  });

  it('drops a name over 512 characters and keeps the entity', () => {
    expect(
      boundAlertEntities({
        found: [
          {
            entities: [host('host:a', 2, 'n'.repeat(513)), host('host:b', 1, 'n'.repeat(512))],
            total: 2,
          },
        ],
        maxEntities: 10,
      }).entities
    ).toEqual([
      { id: 'host:a', type: 'host' },
      { id: 'host:b', name: 'n'.repeat(512), type: 'host' },
    ]);
  });

  it('is empty when nothing was found', () => {
    expect(boundAlertEntities({ found: [{ entities: [], total: 0 }], maxEntities: 10 })).toEqual({
      entities: [],
      total: 0,
      truncated: false,
    });
  });
});
