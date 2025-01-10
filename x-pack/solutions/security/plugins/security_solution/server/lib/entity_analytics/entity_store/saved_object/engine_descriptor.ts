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
import type {
  EngineDescriptor,
  EngineStatus,
  EntityType,
} from '../../../../../common/api/entity_analytics/entity_store/common.gen';

import { entityEngineDescriptorTypeName } from './engine_descriptor_type';
import { getByEntityTypeQuery } from '../utils';
import { ENGINE_STATUS } from '../constants';

interface EngineDescriptorDependencies {
  soClient: SavedObjectsClientContract;
  namespace: string;
}

export class EngineDescriptorClient {
  constructor(private readonly deps: EngineDescriptorDependencies) {}

  getSavedObjectId(entityType: EntityType) {
    return `entity-engine-descriptor-${entityType}-${this.deps.namespace}`;
  }

  async init(
    entityType: EntityType,
    {
      filter,
      fieldHistoryLength,
      indexPattern,
    }: { filter: string; fieldHistoryLength: number; indexPattern: string }
  ) {
    const engineDescriptor = await this.find(entityType);

    if (engineDescriptor.total > 1) {
      throw new Error(`Found multiple engine descriptors for entity type ${entityType}`);
    }

    if (engineDescriptor.total === 1) {
      const old = engineDescriptor.saved_objects[0].attributes;
      const update = {
        ...old,
        error: undefined, // if the engine is being re-initialized, clear any previous error
        status: ENGINE_STATUS.INSTALLING,
        filter,
        fieldHistoryLength,
        indexPattern,
      };
      await this.deps.soClient.update<EngineDescriptor>(
        entityEngineDescriptorTypeName,
        this.getSavedObjectId(entityType),
        update,
        { refresh: 'wait_for' }
      );

      return update;
    }

    const { attributes } = await this.deps.soClient.create<EngineDescriptor>(
      entityEngineDescriptorTypeName,
      {
        status: ENGINE_STATUS.INSTALLING,
        type: entityType,
        indexPattern,
        filter,
        fieldHistoryLength,
      },
      { id: this.getSavedObjectId(entityType) }
    );
    return attributes;
  }

  async update(entityType: EntityType, engine: Partial<EngineDescriptor>) {
    const id = this.getSavedObjectId(entityType);
    const { attributes } = await this.deps.soClient.update<EngineDescriptor>(
      entityEngineDescriptorTypeName,
      id,
      engine,
      { refresh: 'wait_for' }
    );
    return attributes;
  }

  async updateStatus(entityType: EntityType, status: EngineStatus) {
    return this.update(entityType, { status });
  }

  async find(entityType: EntityType): Promise<SavedObjectsFindResponse<EngineDescriptor>> {
    return this.deps.soClient.find<EngineDescriptor>({
      type: entityEngineDescriptorTypeName,
      filter: getByEntityTypeQuery(entityType),
      namespaces: [this.deps.namespace],
    });
  }

  async get(entityType: EntityType): Promise<EngineDescriptor> {
    const id = this.getSavedObjectId(entityType);

    const { attributes } = await this.deps.soClient.get<EngineDescriptor>(
      entityEngineDescriptorTypeName,
      id
    );

    return attributes;
  }

  async maybeGet(entityType: EntityType): Promise<EngineDescriptor | undefined> {
    try {
      const descriptor = await this.get(entityType);
      return descriptor;
    } catch (e) {
      if (e.isBoom && e.output.statusCode === 404) {
        return undefined;
      }
      throw e;
    }
  }

  async list() {
    return this.deps.soClient
      .find<EngineDescriptor>({
        type: entityEngineDescriptorTypeName,
        namespaces: [this.deps.namespace],
      })
      .then(({ saved_objects: engines }) => ({
        engines: engines.map((engine) => engine.attributes),
        count: engines.length,
      }));
  }

  async delete(entityType: EntityType) {
    const id = this.getSavedObjectId(entityType);
    return this.deps.soClient.delete(entityEngineDescriptorTypeName, id);
  }
}
