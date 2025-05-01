/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract, SavedObjectsFindResponse } from '@kbn/core/server';
import { monitoringEntitySourceTypeName } from './monitoring_entity_source_type';

interface MonitoringEntitySourceDependencies {
  soClient: SavedObjectsClientContract;
  namespace: string;
}

interface MonitoringEntitySourceDescriptor {
  type: string;
  name: string;
  managed?: boolean;
  indexPattern?: string;
  detectRemovals?: boolean;
  enabled?: boolean;
  error?: string;
  integrationName?: string;
  matchers?: Array<{
    field: string;
    value: string;
  }>;
  filter?: Record<string, unknown>;
}

export class MonitoringEntitySourceDescriptorClient {
  constructor(private readonly dependencies: MonitoringEntitySourceDependencies) {}

  getSavedObjectId() {
    return `monitoring-entity-source-${this.dependencies.namespace}`;
  }

  async init() {
    const entitySourceDescriptor = await this.find();
    if (entitySourceDescriptor.total === 1) {
      return this.resetToDefaultDescriptor(entitySourceDescriptor);
    }
    const { attributes } =
      await this.dependencies.soClient.create<MonitoringEntitySourceDescriptor>(
        monitoringEntitySourceTypeName,
        {
          type: 'default',
          name: 'default',
          managed: true,
          indexPattern: '',
          detectRemovals: false,
          enabled: true,
          error: undefined,
          integrationName: '',
          matchers: [],
          filter: {},
        },
        { id: this.getSavedObjectId() }
      );
    return attributes;
  }

  private async resetToDefaultDescriptor(
    entitySourceDescriptor: SavedObjectsFindResponse<MonitoringEntitySourceDescriptor, unknown>
  ) {
    const old = entitySourceDescriptor.saved_objects[0].attributes;
    const update = {
      ...old,
      error: undefined,
      type: 'default',
      name: 'default',
      managed: true,
      indexPattern: '',
      detectRemovals: false,
      enabled: true,
      integrationName: '',
      matchers: [],
      filter: {},
    };
    await this.dependencies.soClient.update<MonitoringEntitySourceDescriptor>(
      monitoringEntitySourceTypeName,
      this.getSavedObjectId(),
      update,
      { refresh: 'wait_for' }
    );
    return update;
  }

  async update(monitoringEntitySource: Partial<MonitoringEntitySourceDescriptor>) {
    const id = this.getSavedObjectId();
    const { attributes } =
      await this.dependencies.soClient.update<MonitoringEntitySourceDescriptor>(
        monitoringEntitySourceTypeName,
        id,
        monitoringEntitySource,
        { refresh: 'wait_for' }
      );
    return attributes;
  }

  async find() {
    return this.dependencies.soClient.find<MonitoringEntitySourceDescriptor>({
      type: monitoringEntitySourceTypeName,
      namespaces: [this.dependencies.namespace],
    });
  }

  async get() {
    const id = this.getSavedObjectId();
    const { attributes } = await this.dependencies.soClient.get<MonitoringEntitySourceDescriptor>(
      monitoringEntitySourceTypeName,
      id
    );
    return attributes;
  }

  async delete() {
    const id = this.getSavedObjectId();
    await this.dependencies.soClient.delete(monitoringEntitySourceTypeName, id);
  }

  async list() {
    return this.dependencies.soClient.find<MonitoringEntitySourceDescriptor>({
      type: monitoringEntitySourceTypeName,
      namespaces: [this.dependencies.namespace],
    });
  }
}
