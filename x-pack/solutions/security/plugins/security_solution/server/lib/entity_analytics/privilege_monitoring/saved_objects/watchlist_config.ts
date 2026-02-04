/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse, SavedObjectsClientContract } from '@kbn/core/server';
import { watchlistConfigTypeName } from './watchlist_config_type';

export const MAX_PER_PAGE = 10_000;
interface WatchlistConfigAttributes {
  name: string;
  description?: string;
  riskModifier?: number;
  createdAt: string;
  modifiedAt: string;
}

interface WatchlistConfigClientDeps {
  soClient: SavedObjectsClientContract;
  namespace: string;
}

export class WatchlistConfigClient {
  constructor(private readonly deps: WatchlistConfigClientDeps) {}

  getSavedObjectId(name: string) {
    // Use name as unique identifier within namespace
    return `watchlist-config-${this.deps.namespace}-${name}`;
  }

  async create(attrs: Omit<WatchlistConfigAttributes, 'createdAt' | 'modifiedAt'>) {
    const now = new Date().toISOString();
    const id = this.getSavedObjectId(attrs.name);
    const { attributes } = await this.deps.soClient.create<WatchlistConfigAttributes>(
      watchlistConfigTypeName,
      {
        ...attrs,
        createdAt: now,
        modifiedAt: now,
      },
      { id, refresh: 'wait_for' }
    );
    return attributes;
  }

  async update(
    name: string,
    attrs: Partial<Omit<WatchlistConfigAttributes, 'createdAt' | 'modifiedAt' | 'name'>>
  ) {
    const id = this.getSavedObjectId(name);
    const now = new Date().toISOString();

    const existing = await this.get(name);
    const update = {
      ...existing,
      ...attrs,
      modifiedAt: now,
    };
    const { attributes } = await this.deps.soClient.update<WatchlistConfigAttributes>(
      watchlistConfigTypeName,
      id,
      update,
      { refresh: 'wait_for' }
    );
    return attributes;
  }

  async find(): Promise<SavedObjectsFindResponse<WatchlistConfigAttributes>> {
    return this.deps.soClient.find<WatchlistConfigAttributes>({
      type: watchlistConfigTypeName,
      namespaces: [this.deps.namespace],
      perPage: MAX_PER_PAGE,
    });
  }

  async get(name: string) {
    const id = this.getSavedObjectId(name);
    try {
      const so = await this.deps.soClient.get<WatchlistConfigAttributes>(
        watchlistConfigTypeName,
        id
      );
      return so.attributes;
    } catch (e) {
      if (e.output && e.output.statusCode === 404) {
        throw new Error(`Watchlist config '${name}' not found`);
      }
      throw e;
    }
  }

  async delete(name: string) {
    const id = this.getSavedObjectId(name);
    return this.deps.soClient.delete(watchlistConfigTypeName, id, { refresh: 'wait_for' });
  }
}
