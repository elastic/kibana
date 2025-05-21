/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { monitoringEntitySourceTypeName } from './monitoring_entity_source_type';

export interface MonitoringEntitySourceDependencies {
  soClient: SavedObjectsClientContract;
  namespace: string;
}

export interface MonitoringEntitySourceDescriptor {
  type: string;
  name: string;
  managed?: boolean;
  indexPattern?: string;
  enabled?: boolean;
  error?: string;
  integrationName?: string;
  matchers?: Array<{
    fields: string[];
    values: string[];
  }>;
  filter?: Record<string, unknown>;
}

export class MonitoringEntitySourceDescriptorClient {
  constructor(private readonly dependencies: MonitoringEntitySourceDependencies) {}

  getSavedObjectId() {
    return `entity-analytics-monitoring-entity-source-${this.dependencies.namespace}`;
  }

  async create(attributes: MonitoringEntitySourceDescriptor) {
    const entitySourceDescriptor = await this.find();

    if (entitySourceDescriptor.total === 1) {
      const { attributes: updated } =
        await this.dependencies.soClient.update<MonitoringEntitySourceDescriptor>(
          monitoringEntitySourceTypeName,
          this.getSavedObjectId(),
          attributes,
          { refresh: 'wait_for' }
        );
      return updated;
    }

    const { attributes: created } =
      await this.dependencies.soClient.create<MonitoringEntitySourceDescriptor>(
        monitoringEntitySourceTypeName,
        attributes,
        { id: this.getSavedObjectId() }
      );

    return created;
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
}
