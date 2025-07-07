/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type {
  CreateMonitoringEntitySource,
  ListEntitySourcesRequestQuery,
  MonitoringEntitySource,
} from '../../../../../common/api/entity_analytics/privilege_monitoring/monitoring_entity_source/monitoring_entity_source.gen';
import { monitoringEntitySourceTypeName } from './monitoring_entity_source_type';

export interface MonitoringEntitySourceDependencies {
  soClient: SavedObjectsClientContract;
  namespace: string;
}

export class MonitoringEntitySourceDescriptorClient {
  constructor(private readonly dependencies: MonitoringEntitySourceDependencies) {}

  getDynamicSavedObjectId(attributes: CreateMonitoringEntitySource) {
    const { type, indexPattern, integrationName } = this.assertValidIdFields(attributes);
    const sourceName = indexPattern || integrationName;
    return `entity-analytics-monitoring-entity-source-${this.dependencies.namespace}-${type}${
      sourceName ? `-${sourceName}` : ''
    }`;
  }

  async create(attributes: CreateMonitoringEntitySource) {
    const savedObjectId = this.getDynamicSavedObjectId(attributes);
    await this.assertNameUniqueness({ ...attributes, id: savedObjectId });

    try {
      // If exists, update it.
      const { attributes: updated } =
        await this.dependencies.soClient.update<MonitoringEntitySource>(
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
        await this.dependencies.soClient.create<CreateMonitoringEntitySource>(
          monitoringEntitySourceTypeName,
          { ...attributes, managed: attributes.managed ?? false }, // Ensure managed is set to true on creation
          { id: savedObjectId }
        );
      return { ...created, id: savedObjectId };
    }
  }

  async update(monitoringEntitySource: Partial<MonitoringEntitySource> & { id: string }) {
    await this.assertNameUniqueness(monitoringEntitySource);

    const { attributes } = await this.dependencies.soClient.update<MonitoringEntitySource>(
      monitoringEntitySourceTypeName,
      monitoringEntitySource.id,
      monitoringEntitySource,
      { refresh: 'wait_for' }
    );

    return attributes;
  }

  async find(query?: ListEntitySourcesRequestQuery) {
    const scopedSoClient = this.dependencies.soClient.asScopedToNamespace(
      this.dependencies.namespace
    );

    return scopedSoClient.find<MonitoringEntitySource>({
      type: monitoringEntitySourceTypeName,
      filter: this.getQueryFilters(query),
    });
  }

  private getQueryFilters = (query?: ListEntitySourcesRequestQuery) => {
    return Object.entries(query ?? {})
      .map(([key, value]) => `${monitoringEntitySourceTypeName}.attributes.${key}: ${value}`)
      .join(' and ');
  };

  /**
   * Need to update to understand the id based on the
   * type and indexPattern or integrationName.
   *
   * Two options: create a getById method that takes the id,
   * or use a dynamic ID based on the type and indexPattern/integrationName.
   */
  async get() {
    const { attributes } = await this.dependencies.soClient.get<MonitoringEntitySource>(
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

  public async findByIndex(): Promise<MonitoringEntitySource[]> {
    const result = await this.find();
    return result.saved_objects
      .filter((so) => so.attributes.type === 'index')
      .map((so) => ({ ...so.attributes, id: so.id }));
  }

  public async findAll(query: ListEntitySourcesRequestQuery): Promise<MonitoringEntitySource[]> {
    const result = await this.find(query);
    return result.saved_objects
      .filter((so) => so.attributes.type !== 'csv') // from the spec we are not using CSV on monitoring
      .map((so) => ({ ...so.attributes, id: so.id }));
  }

  private assertValidIdFields(source: Partial<MonitoringEntitySource>): MonitoringEntitySource {
    if (!source.type || (!source.indexPattern && !source.integrationName)) {
      throw new Error('Missing required fields for ID generation');
    }
    return source as MonitoringEntitySource;
  }

  private async assertNameUniqueness(attributes: Partial<MonitoringEntitySource>): Promise<void> {
    if (attributes.name) {
      const { saved_objects: savedObjects } = await this.find({
        name: attributes.name,
      });

      // Exclude the current entity source if updating
      const filteredSavedObjects = attributes.id
        ? savedObjects.filter((so) => so.id !== attributes.id)
        : savedObjects;

      if (filteredSavedObjects.length > 0) {
        throw new Error(
          `A monitoring entity source with the name "${attributes.name}" already exists.`
        );
      }
    }
  }
}
