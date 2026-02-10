/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers, type Logger } from '@kbn/core/server';
import type { EntityType } from '../../../../common/domain/definitions/entity_schema';
import type { EngineDescriptor } from './constants';
import { LogExtractionState, VersionState } from './constants';
import { EngineDescriptorTypeName } from './engine_descriptor_type';
import { ENGINE_STATUS } from '../../constants';

export class EngineDescriptorClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly namespace: string,
    private readonly logger: Logger
  ) {}

  async getAll(): Promise<EngineDescriptor[]> {
    const { saved_objects } = await this.soClient.find<EngineDescriptor>({
      type: EngineDescriptorTypeName,
      namespaces: [this.namespace],
    });

    return saved_objects.map((engine) => engine.attributes);
  }

  async findOrThrow(entityType: EntityType): Promise<EngineDescriptor> {
    const response = await this.find(entityType);

    if (response.total === 0) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(
        `No engine descriptor found for entity type ${entityType}`
      );
    }

    return response.saved_objects[0].attributes;
  }

  async init(
    entityType: EntityType,
    initialState: Partial<LogExtractionState>
  ): Promise<EngineDescriptor> {
    const engineDescriptor = await this.find(entityType);

    if (engineDescriptor.total > 0) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        `Found existing engine descriptor for entity type ${entityType}`
      );
    }

    const id = this.getSavedObjectId(entityType);
    this.logger.debug(`Creating engine descriptor with id ${id}`);

    const logExtractionState = LogExtractionState.parse(initialState);
    const defaultVersionState = VersionState.parse({});
    const { attributes } = await this.soClient.create<EngineDescriptor>(
      EngineDescriptorTypeName,
      {
        status: ENGINE_STATUS.INSTALLING,
        type: entityType,
        logExtractionState,
        versionState: defaultVersionState,
      },
      { id }
    );

    return attributes;
  }

  async update(
    entityType: EntityType,
    state: Partial<EngineDescriptor>
  ): Promise<Partial<EngineDescriptor>> {
    await this.findOrThrow(entityType);

    const id = this.getSavedObjectId(entityType);
    const { attributes } = await this.soClient.update<EngineDescriptor>(
      EngineDescriptorTypeName,
      id,
      state,
      { refresh: 'wait_for' }
    );

    return attributes;
  }

  async delete(entityType: EntityType) {
    await this.findOrThrow(entityType);

    const id = this.getSavedObjectId(entityType);
    this.logger.debug(`Deleting engine descriptor with id ${id}`);
    await this.soClient.delete(EngineDescriptorTypeName, id);
  }

  private getSavedObjectId(entityType: EntityType): string {
    return `${EngineDescriptorTypeName}-${entityType}-${this.namespace}`;
  }

  private find(entityType: EntityType): Promise<SavedObjectsFindResponse<EngineDescriptor>> {
    return this.soClient.find<EngineDescriptor>({
      type: EngineDescriptorTypeName,
      filter: `${EngineDescriptorTypeName}.attributes.type: ${entityType}`,
      namespaces: [this.namespace],
    });
  }
}
