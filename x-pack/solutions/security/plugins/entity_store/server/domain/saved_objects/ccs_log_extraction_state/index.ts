/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers, type Logger } from '@kbn/core/server';
import type { EntityType } from '../../../../common/domain/definitions/entity_schema';
import { CcsLogExtractionState } from './constants';
import { CcsLogExtractionStateTypeName } from './types';

export class CcsLogExtractionStateClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly namespace: string,
    private readonly logger: Logger
  ) {}

  async findOrInit(entityType: EntityType): Promise<CcsLogExtractionState> {
    const id = this.getSavedObjectId(entityType);
    try {
      const { attributes } = await this.soClient.get<CcsLogExtractionState>(
        CcsLogExtractionStateTypeName,
        id
      );
      return CcsLogExtractionState.parse(attributes);
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        this.logger.debug(`CCS log extraction state not found for ${entityType}, creating default`);
        const defaultState = CcsLogExtractionState.parse({});
        try {
          await this.soClient.create<CcsLogExtractionState>(
            CcsLogExtractionStateTypeName,
            defaultState,
            { id }
          );
          return defaultState;
        } catch (createErr) {
          // A concurrent findOrInit won the race — read and return what it created.
          if (SavedObjectsErrorHelpers.isConflictError(createErr)) {
            const { attributes } = await this.soClient.get<CcsLogExtractionState>(
              CcsLogExtractionStateTypeName,
              id
            );
            return CcsLogExtractionState.parse(attributes);
          }
          throw createErr;
        }
      }
      throw err;
    }
  }

  async update(entityType: EntityType, state: Partial<CcsLogExtractionState>): Promise<void> {
    const id = this.getSavedObjectId(entityType);
    await this.soClient.update<CcsLogExtractionState>(CcsLogExtractionStateTypeName, id, state, {
      refresh: 'wait_for',
      mergeAttributes: true,
    });
  }

  async clearRecoveryId(entityType: EntityType): Promise<void> {
    await this.update(entityType, { paginationRecoveryId: null });
  }

  async delete(entityType: EntityType): Promise<void> {
    const id = this.getSavedObjectId(entityType);
    await this.soClient.delete(CcsLogExtractionStateTypeName, id).catch((err) => {
      if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
        throw err;
      }
    });
  }

  private getSavedObjectId(entityType: EntityType): string {
    return `${CcsLogExtractionStateTypeName}-${entityType}-${this.namespace}`;
  }
}
