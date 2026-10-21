/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchSearchedTileEntityIds } from './use_searched_tile_entity_ids';
import type { TileEntityIds } from './use_searched_tile_entity_ids';

const tileEntityIds: TileEntityIds = {
  entitiesWithAlerts: ['host:a', 'user:b'],
  entitiesWithAnomalies: ['user:b'],
  riskMovers: [],
  newlyHighCritical: ['host:c'],
  watchlisted: ['user:b', 'host:c'],
  newEntity: [],
};

const searchArgs = { namespace: 'default', searchExpression: 'KQL("host.name: a")' };

describe('fetchSearchedTileEntityIds', () => {
  it("keeps each tile's ids the search matches", async () => {
    const runQuery = jest.fn().mockResolvedValue([{ 'entity.id': 'user:b' }]);

    const searched = await fetchSearchedTileEntityIds(runQuery, searchArgs, tileEntityIds);

    expect(searched).toEqual({
      entitiesWithAlerts: ['user:b'],
      entitiesWithAnomalies: ['user:b'],
      riskMovers: [],
      newlyHighCritical: [],
      watchlisted: ['user:b'],
      newEntity: [],
    });
  });

  it("searches every tile's ids once, on main entities, right after the search", async () => {
    const runQuery = jest.fn().mockResolvedValue([]);

    await fetchSearchedTileEntityIds(runQuery, searchArgs, tileEntityIds);

    expect(runQuery).toHaveBeenCalledTimes(1);
    const query = runQuery.mock.calls[0][0].join('\n');
    expect(query).toContain('entity.relationships.resolution.resolved_to IS NULL');
    expect(query).toContain('KQL("host.name: a")');
    expect(query).toContain('entity.id IN ("host:a", "user:b", "host:c")');
  });

  it('runs no query when the tiles have no entities', async () => {
    const runQuery = jest.fn();
    const noEntityIds: TileEntityIds = {
      entitiesWithAlerts: [],
      entitiesWithAnomalies: [],
      riskMovers: [],
      newlyHighCritical: [],
      watchlisted: [],
      newEntity: [],
    };

    expect(await fetchSearchedTileEntityIds(runQuery, searchArgs, noEntityIds)).toEqual(
      noEntityIds
    );
    expect(runQuery).not.toHaveBeenCalled();
  });
});
