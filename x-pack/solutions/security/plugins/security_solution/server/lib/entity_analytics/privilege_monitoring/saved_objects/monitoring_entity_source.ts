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

  getDynamicSavedObjectId(attributes: MonitoringEntitySourceDescriptor) {
    const { type, indexPattern, integrationName } = this.assertValidIdFields(attributes);
    const sourceName = indexPattern || integrationName;
    return `entity-analytics-monitoring-entity-source-${this.dependencies.namespace}-${type}${
      sourceName ? `-${sourceName}` : ''
    }`;
  }

  async create(attributes: MonitoringEntitySourceDescriptor) {
    const savedObjectId = this.getDynamicSavedObjectId(attributes);

    try {
      // If exists, update it.
      const { attributes: updated } =
        await this.dependencies.soClient.update<MonitoringEntitySourceDescriptor>(
          monitoringEntitySourceTypeName,
          savedObjectId,
          attributes,
          { refresh: 'wait_for' }
        );
      return updated;
    } catch (e) {
      if (e.output?.statusCode !== 404) throw e;

      // Does not exist, create it.
      const { attributes: created } =
        await this.dependencies.soClient.create<MonitoringEntitySourceDescriptor>(
          monitoringEntitySourceTypeName,
          attributes,
          { id: savedObjectId }
        );
      return created;
    }
  }

  async update(monitoringEntitySource: Partial<MonitoringEntitySourceDescriptor>) {
    const id = this.getDynamicSavedObjectId(
      monitoringEntitySource as MonitoringEntitySourceDescriptor
    );
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

  /**
   * Need to update to understand the id based on the
   * type and indexPattern or integrationName.
   *
   * Two options: create a getById method that takes the id,
   * or use a dynamic ID based on the type and indexPattern/integrationName.
   */
  async get() {
    const { attributes } = await this.dependencies.soClient.get<MonitoringEntitySourceDescriptor>(
      monitoringEntitySourceTypeName,
      'temp-id' // TODO: https://github.com/elastic/security-team/issues/12851
    );
    return attributes;
  }

  /**
   * Need to update to understand the id based on the
   * type and indexPattern or integrationName.
   *
   * * Two options: create a getById method that takes the id,
   * or use a dynamic ID based on the type and indexPattern/integrationName.
   */
  async delete() {
    await this.dependencies.soClient.delete(monitoringEntitySourceTypeName, 'temp-id'); // TODO: https://github.com/elastic/security-team/issues/12851
  }

  public async findByIndex(): Promise<MonitoringEntitySourceDescriptor[]> {
    const result = await this.find();
    return result.saved_objects
      .filter((so) => so.attributes.type === 'index')
      .map((so) => so.attributes);
  }

  public async findAll(): Promise<MonitoringEntitySourceDescriptor[]> {
    const result = await this.find();
    return result.saved_objects
      .filter((so) => so.attributes.type !== 'csv') // from the spec we are not using CSV on monitoring
      .map((so) => so.attributes);
  }

  public assertValidIdFields(
    source: Partial<MonitoringEntitySourceDescriptor>
  ): MonitoringEntitySourceDescriptor {
    if (!source.type || (!source.indexPattern && !source.integrationName)) {
      throw new Error('Missing required fields for ID generation');
    }
    return source as MonitoringEntitySourceDescriptor;
  }
}
