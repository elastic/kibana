/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers, type Logger } from '@kbn/core/server';
import type { GlobalState } from './constants';
import { GlobalState as GlobalStateSchema, HistorySnapshot } from './constants';
import { EntityStoreGlobalStateTypeName } from './types';

export class EntityStoreGlobalStateClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly namespace: string,
    private readonly logger: Logger
  ) {}

  async get(): Promise<GlobalState | null> {
    const id = this.getSavedObjectId();
    try {
      const { attributes } = await this.soClient.get<GlobalState>(
        EntityStoreGlobalStateTypeName,
        id
      );
      return attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async init(initialState?: Partial<GlobalState>): Promise<GlobalState> {
    const existing = await this.get();
    if (existing !== null) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'Found existing global state for this namespace'
      );
    }

    const id = this.getSavedObjectId();
    this.logger.debug(`Creating global state with id ${id}`);

    const historySnapshot = HistorySnapshot.parse(initialState?.historySnapshot ?? {});
    const entityMaintainers = initialState?.entityMaintainers ?? [];
    const defaultState: GlobalState = {
      entityMaintainers,
      historySnapshot,
    };
    const parsed = GlobalStateSchema.parse(defaultState);

    const { attributes } = await this.soClient.create<GlobalState>(
      EntityStoreGlobalStateTypeName,
      parsed,
      { id }
    );

    return attributes;
  }

  async update(partial: Partial<GlobalState>): Promise<Partial<GlobalState>> {
    await this.getOrThrow();

    const id = this.getSavedObjectId();
    const { attributes } = await this.soClient.update<GlobalState>(
      EntityStoreGlobalStateTypeName,
      id,
      partial,
      {
        refresh: 'wait_for',
        mergeAttributes: true,
      }
    );

    return attributes;
  }

  async delete(): Promise<void> {
    await this.getOrThrow();

    const id = this.getSavedObjectId();
    this.logger.debug(`Deleting global state with id ${id}`);
    await this.soClient.delete(EntityStoreGlobalStateTypeName, id);
  }

  private getSavedObjectId(): string {
    return `entity-store-global-state-${this.namespace}`;
  }

  private async getOrThrow(): Promise<GlobalState> {
    const state = await this.get();
    if (state === null) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(
        'No global state found for this namespace'
      );
    }
    return state;
  }
}
