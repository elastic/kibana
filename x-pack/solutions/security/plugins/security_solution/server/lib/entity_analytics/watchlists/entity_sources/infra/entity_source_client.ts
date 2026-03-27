/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import _ from 'lodash';
import type {
  MonitoringEntitySourceAttributes,
  MonitoringEntitySource,
} from '../../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import type {
  ListWatchlistEntitySourcesRequestQuery,
  ListWatchlistEntitySourcesResponse,
} from '../../../../../../common/api/entity_analytics/watchlists/data_source/list.gen';
import { watchlistEntitySourceTypeName } from './entity_source_type';

export interface WatchlistEntitySourceClientDependencies {
  soClient: SavedObjectsClientContract;
  namespace: string;
}

interface UpsertResult {
  action: 'created' | 'updated';
  source: MonitoringEntitySource;
}

export class WatchlistEntitySourceClient {
  constructor(private readonly dependencies: WatchlistEntitySourceClientDependencies) {}

  async create(attributes: MonitoringEntitySourceAttributes): Promise<MonitoringEntitySource> {
    await this.assertNameUniqueness(attributes);

    const { id, attributes: created } =
      await this.dependencies.soClient.create<MonitoringEntitySourceAttributes>(
        watchlistEntitySourceTypeName,
        { ...attributes, managed: attributes.managed ?? false },
        { refresh: 'wait_for' }
      );

    return { ...created, id };
  }

  async upsert(source: Partial<MonitoringEntitySource>): Promise<UpsertResult> {
    const { sources } = await this.list({ name: source.name, per_page: 1 });
    const found = sources[0];

    if (found) {
      // TODO: Add matcher override protection (matchersModifiedByUser) once
      // managed source reconciliation is implemented for watchlists.
      const updated = await this.update({ ...source, id: found.id });
      return { action: 'updated', source: updated };
    }

    const created = await this.create(source);
    return { action: 'created', source: created };
  }

  async update(
    entitySource: Partial<MonitoringEntitySource> & { id: string }
  ): Promise<MonitoringEntitySource> {
    await this.assertNameUniqueness(entitySource);
    const { attributes } =
      await this.dependencies.soClient.update<MonitoringEntitySourceAttributes>(
        watchlistEntitySourceTypeName,
        entitySource.id,
        _.omit(entitySource, 'id'),
        { refresh: 'wait_for' }
      );

    return { ...attributes, id: entitySource.id };
  }

  async get(id: string): Promise<MonitoringEntitySource> {
    const { attributes, id: savedObjectId } =
      await this.dependencies.soClient.get<MonitoringEntitySource>(
        watchlistEntitySourceTypeName,
        id
      );
    return { ...attributes, id: savedObjectId };
  }

  async delete(id: string): Promise<void> {
    await this.dependencies.soClient.delete(watchlistEntitySourceTypeName, id);
  }

  async find({
    kuery,
    sortField,
    sortOrder,
    page,
    perPage,
  }: {
    kuery: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    perPage?: number;
  }): Promise<ListWatchlistEntitySourcesResponse> {
    const soResult = await this.dependencies.soClient.find<MonitoringEntitySource>({
      type: watchlistEntitySourceTypeName,
      filter: kuery,
      sortField,
      sortOrder,
      page,
      perPage,
    });

    return {
      sources: soResult.saved_objects.map((so) => ({ ...so.attributes, id: so.id })),
      page: page ?? 1,
      per_page: perPage ?? 10,
      total: soResult.total,
    };
  }

  async list(
    query: ListWatchlistEntitySourcesRequestQuery,
    ids?: string[]
  ): Promise<ListWatchlistEntitySourcesResponse> {
    return this.find({
      kuery: this.getQueryFilters(query, ids),
      sortField: query?.sort_field ?? undefined,
      sortOrder: query?.sort_order ?? undefined,
      page: query?.page ?? 1,
      perPage: query?.per_page ?? 10,
    });
  }

  private getQueryFilters(query?: ListWatchlistEntitySourcesRequestQuery, ids?: string[]): string {
    const queryParts = _.pick(query ?? {}, ['type', 'managed', 'name']);
    const filters = Object.entries(queryParts).map(
      ([key, value]) => `${watchlistEntitySourceTypeName}.attributes.${key}: ${value}`
    );

    if (ids?.length) {
      const idFilter = ids.map((id) => `${watchlistEntitySourceTypeName}.id: "${id}"`).join(' or ');
      filters.push(`(${idFilter})`);
    }

    return filters.join(' and ');
  }

  private async assertNameUniqueness(attributes: Partial<MonitoringEntitySource>): Promise<void> {
    if (attributes.name) {
      const { sources } = await this.list({ name: attributes.name });

      const filtered = attributes.id ? sources.filter((so) => so.id !== attributes.id) : sources;

      if (filtered.length > 0) {
        throw new Error(
          `A watchlist entity source with the name "${attributes.name}" already exists.`
        );
      }
    }
  }

  /**
   * Integrations Sync Marker Methods
   */
  async updateLastProcessedMarker(
    source: MonitoringEntitySource,
    lastProcessedMarker: string
  ): Promise<void> {
    await this.update({
      ...source,
      integrations: {
        syncData: {
          lastUpdateProcessed: lastProcessedMarker,
        },
      },
    });
  }

  async getLastProcessedMarker(source: MonitoringEntitySource): Promise<string | undefined> {
    return source.integrations?.syncData?.lastUpdateProcessed;
  }

  async getLastFullSyncMarker(source: MonitoringEntitySource): Promise<string | undefined> {
    return source.integrations?.syncData?.lastFullSync;
  }

  async updateLastFullSyncMarker(
    source: MonitoringEntitySource,
    lastFullSyncMarker: string
  ): Promise<void> {
    await this.update({
      ...source,
      integrations: {
        syncData: {
          lastFullSync: lastFullSyncMarker,
        },
      },
    });
  }
}
