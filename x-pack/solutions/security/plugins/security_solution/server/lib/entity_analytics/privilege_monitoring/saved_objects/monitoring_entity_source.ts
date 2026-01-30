/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import _ from 'lodash';
import type {
  MonitoringEntitySourceAttributes,
  ListEntitySourcesRequestQuery,
  MonitoringEntitySource,
  ListEntitySourcesResponse,
} from '../../../../../common/api/entity_analytics';
import { monitoringEntitySourceTypeName } from './monitoring_entity_source_type';
import type { PartialMonitoringEntitySource } from '../types';

export interface MonitoringEntitySourceDependencies {
  soClient: SavedObjectsClientContract;
  namespace: string;
}

type UpsertInput = MonitoringEntitySource | MonitoringEntitySourceAttributes;
interface UpsertResult {
  action: 'created' | 'updated';
  source: MonitoringEntitySource;
}

export type Processor = (source: MonitoringEntitySource) => Promise<void>;

export class MonitoringEntitySourceDescriptorClient {
  constructor(private readonly dependencies: MonitoringEntitySourceDependencies) {}

  async create(attributes: MonitoringEntitySourceAttributes) {
    await this.assertNameUniqueness(attributes);

    const { id, attributes: created } =
      await this.dependencies.soClient.create<MonitoringEntitySourceAttributes>(
        monitoringEntitySourceTypeName,
        { ...attributes, managed: attributes.managed ?? false },
        { refresh: 'wait_for' }
      );

    return { ...created, id };
  }

  async bulkCreate(sources: MonitoringEntitySourceAttributes[]) {
    const createdSources = await this.dependencies.soClient.bulkCreate(
      sources.map((source) => ({
        type: monitoringEntitySourceTypeName,
        attributes: { ...source },
      })),
      { refresh: 'wait_for' }
    );
    return createdSources;
  }

  async upsert(source: UpsertInput): Promise<UpsertResult> {
    const { sources } = await this.list({ name: source.name, per_page: 1 });
    const found = sources[0];
    if (found) {
      await this.update({ ...source, id: found.id });
      return { action: 'updated', source: { ...source, id: found.id } as MonitoringEntitySource };
    } else {
      const createdSource = await this.create(source);
      return { action: 'created', source: createdSource };
    }
  }

  async bulkUpsert(sources: UpsertInput[]) {
    if (!sources.length) return { created: 0, updated: 0, results: [] };

    let created = 0;
    let updated = 0;
    const results: UpsertResult[] = [];
    const BATCH_SIZE = 100;

    for (let i = 0; i < sources.length; i += BATCH_SIZE) {
      const batch = sources.slice(i, i + BATCH_SIZE);

      // Build KQL query to find existing sources by name
      const kuery = batch
        .map((source) => `${monitoringEntitySourceTypeName}.attributes.name: "${source.name}"`)
        .join(' or ');

      // Lookup existing sources for this batch
      const { sources: existingSources } = await this.find({
        kuery,
        perPage: BATCH_SIZE,
      });

      const existingByName = new Map<string, MonitoringEntitySource>();
      for (const source of existingSources) {
        if (source.name) {
          existingByName.set(source.name, source);
        }
      }

      // Create or update each source in the batch
      for (const attrs of batch) {
        const existing = existingByName.get(attrs.name ?? '');
        if (existing) {
          const updatedSo = await this.updateWithMatcherProtection(existing, attrs);
          updated++;
          results.push({ action: 'updated', source: updatedSo });
        } else {
          const createdSo = await this.create(attrs);
          created++;
          results.push({ action: 'created', source: createdSo });
        }
      }
    }

    return { created, updated, results };
  }

  async update(
    monitoringEntitySource: PartialMonitoringEntitySource
  ): Promise<MonitoringEntitySource> {
    await this.assertNameUniqueness(monitoringEntitySource);
    const { attributes } = await this.dependencies.soClient.update<MonitoringEntitySource>(
      monitoringEntitySourceTypeName,
      monitoringEntitySource.id,
      monitoringEntitySource,
      { refresh: 'wait_for' }
    );

    return { ...(attributes as MonitoringEntitySource), id: monitoringEntitySource.id };
  }

  async updateWithoutMatchers(
    monitoringEntitySource: PartialMonitoringEntitySource
  ): Promise<MonitoringEntitySource> {
    const { matchers: _matchers, ...rest } = monitoringEntitySource;
    return this.update(rest);
  }

  /**
   * If the matchers have been modified by the user,
   * we need to update the source without the matchers.
   * This is to prevent custom matchers from being overwritten by the default matchers.
   * @param existing
   * @param attrs
   * @returns
   */
  private async updateWithMatcherProtection(
    existing: MonitoringEntitySource,
    attrs: UpsertInput
  ): Promise<MonitoringEntitySource> {
    const updateFn = existing.matchersModifiedByUser
      ? (input: PartialMonitoringEntitySource) => this.updateWithoutMatchers(input)
      : (input: PartialMonitoringEntitySource) => this.update(input);
    return updateFn({ id: existing.id, ...attrs });
  }

  private getQueryFilters = (query?: ListEntitySourcesRequestQuery) => {
    const queryParts = _.pick(query ?? {}, ['type', 'managed', 'name']);
    return Object.entries(queryParts)
      .map(([key, value]) => `${monitoringEntitySourceTypeName}.attributes.${key}: ${value}`)
      .join(' and ');
  };

  async get(id: string): Promise<MonitoringEntitySource> {
    const { attributes, id: savedObjectId } =
      await this.dependencies.soClient.get<MonitoringEntitySource>(
        monitoringEntitySourceTypeName,
        id
      );
    return { ...attributes, id: savedObjectId };
  }

  async delete(id: string) {
    await this.dependencies.soClient.delete(monitoringEntitySourceTypeName, id);
  }

  async find({
    kuery,
    sortField,
    sortOrder,
    page,
    perPage,
  }: {
    kuery: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    perPage?: number;
  }): Promise<ListEntitySourcesResponse> {
    const scopedSoClient = this.dependencies.soClient;
    const soResult = await scopedSoClient.find<MonitoringEntitySource>({
      type: monitoringEntitySourceTypeName,
      filter: kuery,
      sortField,
      sortOrder,
      page,
      perPage,
    });

    return {
      sources: soResult.saved_objects.map((so) => ({ ...so.attributes, id: so.id })),
      page: page ?? 1,
      per_page: perPage ?? 10,
      total: soResult.total,
    };
  }

  public async list(query: ListEntitySourcesRequestQuery): Promise<ListEntitySourcesResponse> {
    return this.find({
      kuery: this.getQueryFilters(query),
      sortField: query?.sort_field ?? undefined,
      sortOrder: query?.sort_order ?? undefined,
      page: query?.page ?? 1,
      perPage: query?.per_page ?? 10,
    });
  }

  public async listByKuery({
    kuery,
    sortField,
    sortOrder,
    page,
    perPage,
  }: {
    kuery: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    perPage?: number;
  }): Promise<ListEntitySourcesResponse> {
    return this.find({
      kuery,
      sortField,
      sortOrder,
      page,
      perPage,
    });
  }

  private async assertNameUniqueness(attributes: Partial<MonitoringEntitySource>): Promise<void> {
    if (attributes.name) {
      const { sources } = await this.list({
        name: attributes.name,
      });

      // Exclude the current entity source if updating
      const filteredSavedObjects = attributes.id
        ? sources.filter((so) => so.id !== attributes.id)
        : sources;

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

  async getLastFullSyncMarker(source: MonitoringEntitySource): Promise<string | undefined> {
    return source.integrations?.syncData?.lastFullSync;
  }

  async updateLastFullSyncMarker(
    source: MonitoringEntitySource,
    lastFullSyncMarker: string
  ): Promise<void> {
    await this.update({
      ...source,
      integrations: {
        syncData: {
          lastFullSync: lastFullSyncMarker,
        },
      },
    });
  }
}
