/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers, type Logger } from '@kbn/core/server';
import type { EntityType } from '../../../../common/domain/definitions/entity_schema';
import { RemoteLogExtractionState } from './constants';
import type { RemoteLogExtractionStateTypeName } from './types';

/**
 * Persistence client for the per-strategy remote-extraction resume state.
 * One instance per active strategy (CCS or CPS) — the constructor takes the SO
 * type name, so the same class backs both `entity-store-ccs-state` and
 * `entity-store-cps-state` rows with strategy-isolated storage.
 */
export class RemoteLogExtractionStateClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly namespace: string,
    private readonly logger: Logger,
    private readonly typeName: RemoteLogExtractionStateTypeName
  ) {}

  async findOrInit(entityType: EntityType): Promise<RemoteLogExtractionState> {
    const id = this.getSavedObjectId(entityType);
    try {
      const { attributes } = await this.soClient.get<RemoteLogExtractionState>(this.typeName, id);
      return RemoteLogExtractionState.parse(attributes);
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        this.logger.debug(
          `${this.typeName}: log extraction state not found for ${entityType}, creating default`
        );
        const defaultState = RemoteLogExtractionState.parse({});
        try {
          await this.soClient.create<RemoteLogExtractionState>(this.typeName, defaultState, { id });
          return defaultState;
        } catch (createErr) {
          // A concurrent findOrInit won the race — read and return what it created.
          if (SavedObjectsErrorHelpers.isConflictError(createErr)) {
            const { attributes } = await this.soClient.get<RemoteLogExtractionState>(
              this.typeName,
              id
            );
            return RemoteLogExtractionState.parse(attributes);
          }
          throw createErr;
        }
      }
      throw err;
    }
  }

  async update(entityType: EntityType, state: Partial<RemoteLogExtractionState>): Promise<void> {
    const id = this.getSavedObjectId(entityType);
    await this.soClient.update<RemoteLogExtractionState>(this.typeName, id, state, {
      refresh: 'wait_for',
      mergeAttributes: true,
    });
  }

  async clearRecoveryId(entityType: EntityType): Promise<void> {
    await this.update(entityType, { paginationRecoveryId: null });
  }

  async delete(entityType: EntityType): Promise<void> {
    const id = this.getSavedObjectId(entityType);
    await this.soClient.delete(this.typeName, id).catch((err) => {
      if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
        throw err;
      }
    });
  }

  private getSavedObjectId(entityType: EntityType): string {
    return `${this.typeName}-${entityType}-${this.namespace}`;
  }
}
