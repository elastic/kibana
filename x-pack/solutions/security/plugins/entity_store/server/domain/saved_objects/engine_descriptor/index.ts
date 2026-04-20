/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers, type Logger } from '@kbn/core/server';
import type { EntityType } from '../../../../common/domain/definitions/entity_schema';
import { ALL_ENTITY_TYPES } from '../../../../common/domain/definitions/entity_schema';
import type { EngineDescriptor } from './constants';
import { EngineLogExtractionState, VersionState } from './constants';
import { EngineDescriptorTypeName } from './types';
import { ENGINE_STATUS } from '../../constants';

interface UpdateOptions {
  mergeAttributes?: boolean;
}

export class EngineDescriptorClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly namespace: string,
    private readonly logger: Logger
  ) {}

  async getAll(): Promise<EngineDescriptor[]> {
    const objects = ALL_ENTITY_TYPES.map((type) => ({
      type: EngineDescriptorTypeName,
      id: this.getSavedObjectId(type),
    }));

    const { saved_objects } = await this.soClient.bulkGet<EngineDescriptor>(objects);

    return saved_objects.filter((so) => !so.error).map((so) => so.attributes);
  }

  async findOrThrow(entityType: EntityType): Promise<EngineDescriptor> {
    const descriptor = await this.getByType(entityType);

    if (!descriptor) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(
        `No engine descriptor found for entity type ${entityType}`
      );
    }

    return descriptor;
  }

  async init(entityType: EntityType): Promise<EngineDescriptor> {
    const existing = await this.getByType(entityType);

    if (existing) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        `Found existing engine descriptor for entity type ${entityType}`
      );
    }

    const id = this.getSavedObjectId(entityType);
    this.logger.debug(`Creating engine descriptor with id ${id}`);

    const logExtractionState = EngineLogExtractionState.parse({});
    const defaultVersionState = VersionState.parse({});
    const { attributes } = await this.soClient.create<EngineDescriptor>(
      EngineDescriptorTypeName,
      {
        status: ENGINE_STATUS.INSTALLING,
        type: entityType,
        logExtractionState,
        versionState: defaultVersionState,
      },
      { id, refresh: 'wait_for' }
    );

    return attributes;
  }

  async updateWith(
    entityType: EntityType,
    updater: (current: EngineDescriptor) => EngineDescriptor
  ): Promise<EngineDescriptor> {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const currentSo = await this.getSOByType(entityType);
      if (!currentSo) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(
          `No engine descriptor found for entity type ${entityType}`
        );
      }
      const updated = updater(currentSo.attributes);
      const id = this.getSavedObjectId(entityType);
      try {
        const { attributes } = await this.soClient.update<EngineDescriptor>(
          EngineDescriptorTypeName,
          id,
          updated,
          { refresh: 'wait_for', mergeAttributes: false, version: currentSo.version }
        );
        return attributes as EngineDescriptor;
      } catch (e) {
        if (SavedObjectsErrorHelpers.isConflictError(e) && attempt < maxRetries - 1) {
          this.logger.debug(
            `Version conflict updating engine descriptor for ${entityType}, retrying (attempt ${
              attempt + 1
            })`
          );
          continue;
        }
        throw e;
      }
    }
    throw new Error(`updateWith exceeded max retries for entity type ${entityType}`);
  }

  async update(
    entityType: EntityType,
    state: Partial<EngineDescriptor>,
    { mergeAttributes = true }: UpdateOptions = {}
  ): Promise<Partial<EngineDescriptor>> {
    await this.findOrThrow(entityType);

    const id = this.getSavedObjectId(entityType);
    const { attributes } = await this.soClient.update<EngineDescriptor>(
      EngineDescriptorTypeName,
      id,
      state,
      {
        refresh: 'wait_for',
        mergeAttributes,
      }
    );

    return attributes;
  }

  async delete(entityType: EntityType) {
    await this.findOrThrow(entityType);

    const id = this.getSavedObjectId(entityType);
    this.logger.debug(`Deleting engine descriptor with id ${id}`);
    await this.soClient.delete(EngineDescriptorTypeName, id, { refresh: 'wait_for' });
  }

  private getSavedObjectId(entityType: EntityType): string {
    return `${EngineDescriptorTypeName}-${entityType}-${this.namespace}`;
  }

  private async getByType(entityType: EntityType): Promise<EngineDescriptor | null> {
    const so = await this.getSOByType(entityType);
    return so ? so.attributes : null;
  }

  private async getSOByType(entityType: EntityType) {
    const id = this.getSavedObjectId(entityType);
    try {
      return await this.soClient.get<EngineDescriptor>(EngineDescriptorTypeName, id);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return null;
      }
      throw e;
    }
  }
}
