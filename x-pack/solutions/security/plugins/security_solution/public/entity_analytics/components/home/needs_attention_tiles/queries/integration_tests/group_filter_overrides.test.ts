/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import type { EntityFilters, Row } from '../../../entities_grid/common';
import { EMPTY_ENTITY_FILTERS } from '../../../entities_grid/common';
import { buildEntityFiltersExpression } from '../../../entities_grid/queries/entity_filters';
import {
  buildFilterClause,
  getAlertsIndex,
  getEntityAlias,
} from '../../../entities_grid/queries/esql';
import {
  applyResolvedEntityFilterOverrides,
  fetchResolvedEntityFilterOverrides,
} from '../../../entities_grid/queries/resolved_entities';
import type { EsqlRunner } from '../../../entities_grid/queries/types';
import { buildAlertBasedTilesQuery } from '../entities_with_alerts_query';
import { buildNewEntityCountQuery } from '../new_entity_query';

/*
 * The tiles count groups, so the entity filters judge a group by its values, as the grid does on
 * resolved rows: the groups that pass differently from their main entity are read with the grid's
 * overrides query and added or removed by id (see `useTileQueryInputs`). Each main entity below has
 * a high alert a day ago, was first seen 2 days ago and has a risk score.
 *
 * | main entity | criticality, watchlist | alias: criticality, watchlist | Watchlists w1 | Criticality low |
 * |-------------|------------------------|-------------------------------|---------------|-----------------|
 * | host:inc    | low, -                 | host:inca: high, w1           | added         | removed         |
 * | host:exc    | low, w1                | host:exca: extreme, -         | passes        | removed         |
 * | host:plain  | low, w1                | -                             | passes        | passes          |
 *
 * host:inca also has a high alert 9 days ago, in the previous 7 days.
 */

const NAMESPACE = 'default';
const ENTITY_INDEX = 'entities-latest-group-filter-overrides-test';
const DAY_MS = 24 * 60 * 60 * 1000;

const KEYWORD: MappingProperty = { type: 'keyword' };
const DATE: MappingProperty = { type: 'date' };
const FLOAT: MappingProperty = { type: 'float' };

interface EntitySeed {
  id: string;
  criticality: string;
  watchlist?: string;
  resolvedTo?: string;
}

const ENTITIES: readonly EntitySeed[] = [
  { id: 'host:inc', criticality: 'low_impact' },
  { id: 'host:inca', criticality: 'high_impact', watchlist: 'w1', resolvedTo: 'host:inc' },
  { id: 'host:exc', criticality: 'low_impact', watchlist: 'w1' },
  { id: 'host:exca', criticality: 'extreme_impact', resolvedTo: 'host:exc' },
  { id: 'host:plain', criticality: 'low_impact', watchlist: 'w1' },
];

const ALERTS: ReadonlyArray<[entityId: string, daysAgo: number]> = [
  ['host:inc', 1],
  ['host:exc', 1],
  ['host:plain', 1],
  ['host:inca', 9],
];

const isoDaysAgo = (now: number, days: number) => new Date(now - days * DAY_MS).toISOString();

const loadFixture = async (client: Client) => {
  const now = Date.now();
  await client.indices.create({
    index: ENTITY_INDEX,
    // In lookup mode, so the queries can LOOKUP JOIN it.
    settings: { index: { mode: 'lookup' } },
    // The overrides query reads the entities through the space's alias, as in a deployment.
    aliases: { [getEntityAlias(NAMESPACE)]: {} },
    mappings: {
      properties: {
        '@timestamp': DATE,
        'entity.id': KEYWORD,
        'entity.name': KEYWORD,
        'entity.EngineMetadata.Type': KEYWORD,
        'entity.source': KEYWORD,
        'entity.attributes.watchlists': KEYWORD,
        'entity.lifecycle.first_seen': DATE,
        'entity.risk.calculated_score': FLOAT,
        'entity.risk.calculated_level': KEYWORD,
        'entity.relationships.resolution.resolved_to': KEYWORD,
        'entity.relationships.resolution.risk.calculated_score': FLOAT,
        'entity.relationships.resolution.risk.calculated_level': KEYWORD,
        'asset.criticality': KEYWORD,
      },
    },
  });
  await client.indices.create({
    index: getAlertsIndex(NAMESPACE),
    mappings: {
      properties: {
        '@timestamp': DATE,
        'kibana.alert.entity.id': KEYWORD,
        'kibana.alert.severity': KEYWORD,
        'kibana.alert.workflow_status': KEYWORD,
      },
    },
  });
  const operations = [
    ...ENTITIES.flatMap(({ id, criticality, watchlist, resolvedTo }) => [
      { index: { _index: ENTITY_INDEX } },
      {
        '@timestamp': isoDaysAgo(now, 1),
        'entity.id': id,
        'entity.name': id.split(':')[1],
        'entity.EngineMetadata.Type': 'host',
        'entity.lifecycle.first_seen': isoDaysAgo(now, 2),
        'entity.risk.calculated_score': 50,
        'asset.criticality': criticality,
        ...(watchlist ? { 'entity.attributes.watchlists': watchlist } : {}),
        ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
      },
    ]),
    ...ALERTS.flatMap(([entityId, daysAgo]) => [
      { index: { _index: getAlertsIndex(NAMESPACE) } },
      {
        '@timestamp': isoDaysAgo(now, daysAgo),
        'kibana.alert.entity.id': entityId,
        'kibana.alert.severity': 'high',
      },
    ]),
  ];
  const response = await client.bulk({ operations, refresh: 'wait_for' });
  if (response.errors) throw new Error('Bulk indexing of the group filter fixture failed');
};

const ids = (value: unknown) => [value ?? []].flat().map(String).sort();

describe('tile entity filters judged by the group, on Elasticsearch', () => {
  let esServer: ReturnType<typeof createTestEsCluster>;
  let client: Client;

  const runQuery: EsqlRunner = async (steps) => {
    const { columns, values } = await client.esql.query({ query: steps.join('\n') });
    return values.map((row): Row =>
      Object.fromEntries(columns.map(({ name }, i) => [name, row[i]]))
    );
  };

  /** The tile clauses the way `useTileQueryInputs` builds them, with the real overrides query. */
  const clausesFor = async (filters: EntityFilters): Promise<string[]> => {
    const entityExpression = buildEntityFiltersExpression(filters, 'resolved');
    const overrides = await fetchResolvedEntityFilterOverrides(
      {
        namespace: NAMESPACE,
        concreteEntityIndexName: ENTITY_INDEX,
        entityExpression,
        rowsMode: 'resolved',
      },
      runQuery
    );
    return buildFilterClause(applyResolvedEntityFilterOverrides(entityExpression, overrides));
  };

  const run = async (query: string) => (await runQuery([query]))[0] ?? {};

  const tiles = async (filters: EntityFilters) => {
    const clauses = await clausesFor(filters);
    const current = await run(buildAlertBasedTilesQuery(ENTITY_INDEX, NAMESPACE, '7d', clauses));
    const previous = await run(
      buildAlertBasedTilesQuery(ENTITY_INDEX, NAMESPACE, '7d', clauses, 'previous')
    );
    const newEntity = await run(buildNewEntityCountQuery(ENTITY_INDEX, '7d', clauses));
    return {
      severe: ids(current.severe_alerts_entity_ids),
      previousSevere: Number(previous.severe_alerts_count),
      newEntity: ids(newEntity.entity_ids),
    };
  };

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
    });
    await esServer.start();
    client = esServer.getClient();
    await loadFixture(client);
  }, 300_000);

  afterAll(async () => {
    await esServer?.stop();
  });

  it('adds a group whose alias is on the watchlist, though its main entity is not', async () => {
    expect(await tiles({ ...EMPTY_ENTITY_FILTERS, watchlists: ['w1'] })).toEqual({
      severe: ['host:exc', 'host:inc', 'host:plain'],
      // Only host:inca alerted in the previous period, and its group passes through it.
      previousSevere: 1,
      newEntity: ['host:exc', 'host:inc', 'host:plain'],
    });
  });

  it("removes a group whose highest criticality fails, though its main entity's passes", async () => {
    expect(await tiles({ ...EMPTY_ENTITY_FILTERS, assetCriticality: ['low_impact'] })).toEqual({
      severe: ['host:plain'],
      previousSevere: 0,
      newEntity: ['host:plain'],
    });
  });

  it('judges the main entity alone without the overrides, which is what they fix', async () => {
    const clauses = buildFilterClause(
      buildEntityFiltersExpression({ ...EMPTY_ENTITY_FILTERS, watchlists: ['w1'] }, 'resolved')
    );
    const current = await run(buildAlertBasedTilesQuery(ENTITY_INDEX, NAMESPACE, '7d', clauses));
    expect(ids(current.severe_alerts_entity_ids)).toEqual(['host:exc', 'host:plain']);
  });
});
