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
} from '../../../../../common/api/entity_analytics';
import { monitoringEntitySourceTypeName } from './monitoring_entity_source_type';
import type { MonitoringEntitySyncType } from '../types';

export interface MonitoringEntitySourceDependencies {
  soClient: SavedObjectsClientContract;
  namespace: string;
}

type UpsertWithId = CreateMonitoringEntitySource & { id: string };
type UpsertInput = CreateMonitoringEntitySource | UpsertWithId;
interface UpsertResult {
  action: 'created' | 'updated';
  source: MonitoringEntitySource;
}

export type Processor = (source: MonitoringEntitySource) => Promise<void>;

export class MonitoringEntitySourceDescriptorClient {
  constructor(private readonly dependencies: MonitoringEntitySourceDependencies) {}

  async create(attributes: CreateMonitoringEntitySource) {
    await this.assertNameUniqueness(attributes);

    const { id, attributes: created } =
      await this.dependencies.soClient.create<CreateMonitoringEntitySource>(
        monitoringEntitySourceTypeName,
        { ...attributes, managed: attributes.managed ?? false } // Ensure managed is set to true on creation
      );

    return { ...created, id };
  }

  async bulkCreate(sources: CreateMonitoringEntitySource[]) {
    const createdSources = await this.dependencies.soClient.bulkCreate(
      sources.map((source) => ({
        type: monitoringEntitySourceTypeName,
        attributes: { ...source },
      }))
    );
    return createdSources;
  }

  async upsert(source: UpsertInput): Promise<UpsertResult> {
    const foundResult = await this.find({ name: source.name });
    const found = foundResult.saved_objects[0];
    if (found) {
      await this.update({ ...source, id: found.id });
      return { action: 'updated', source: { ...source, id: found.id } as MonitoringEntitySource };
    } else {
      const createdSource = await this.create(source as CreateMonitoringEntitySource);
      return { action: 'created', source: createdSource };
    }
  }

  async bulkUpsert(sources: UpsertInput[]) {
    if (!sources.length) return { created: 0, updated: 0, results: [] };

    const existing = await this.findAll({});
    const byName = new Map(existing.map((s) => [s.name, s]));

    let created = 0;
    let updated = 0;
    const results: UpsertResult[] = [];

    for (const attrs of sources) {
      const found = byName.get(attrs.name);
      if (!found) {
        const createdSo = await this.create(attrs);
        created++;
        byName.set(createdSo.name, createdSo);
        results.push({ action: 'created', source: createdSo });
      } else {
        const updatedSo = await this.update({ id: found.id, ...attrs });
        updated++;
        byName.set(updatedSo.name, updatedSo);
        results.push({ action: 'updated', source: updatedSo });
      }
    }
    return { created, updated, results };
  }

  async update(
    monitoringEntitySource: Partial<MonitoringEntitySource> & { id: string }
  ): Promise<MonitoringEntitySource> {
    await this.assertNameUniqueness(monitoringEntitySource);

    const { attributes } = await this.dependencies.soClient.update<MonitoringEntitySource>(
      monitoringEntitySourceTypeName,
      monitoringEntitySource.id,
      monitoringEntitySource,
      { refresh: 'wait_for' }
    );

    return { ...attributes, id: monitoringEntitySource.id };
  }

  async find(query?: ListEntitySourcesRequestQuery) {
    const scopedSoClient = this.dependencies.soClient;
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

  async get(id: string): Promise<MonitoringEntitySource> {
    const { attributes } = await this.dependencies.soClient.get<MonitoringEntitySource>(
      monitoringEntitySourceTypeName,
      id
    );
    return attributes;
  }

  async delete(id: string) {
    await this.dependencies.soClient.delete(monitoringEntitySourceTypeName, id);
  }

  /**
   * entity_analytics_integration or index type
   */
  public async findSourcesByType(
    type: MonitoringEntitySyncType
  ): Promise<MonitoringEntitySource[]> {
    const result = await this.find();
    return result.saved_objects
      .filter((so) => so.attributes.type === type)
      .map((so) => ({ ...so.attributes, id: so.id }));
  }

  public async findAll(query: ListEntitySourcesRequestQuery): Promise<MonitoringEntitySource[]> {
    const result = await this.find(query);
    return result.saved_objects
      .filter((so) => so.attributes.type !== 'csv') // from the spec we are not using CSV on monitoring
      .map((so) => ({ ...so.attributes, id: so.id }));
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

  /**
   * Integrations Specific Methods
   */
  async updateLastProcessedMarker(
    source: MonitoringEntitySource,
    lastProcessedMarker: string
  ): Promise<void> {
    await this.update({
      ...source,
      integrations: {
        syncData: {
          lastUpdateProcessed: lastProcessedMarker,
        },
      },
    });
  }

  async getLastProcessedMarker(source: MonitoringEntitySource): Promise<string | undefined> {
    return source.integrations?.syncData?.lastUpdateProcessed;
  }
}
