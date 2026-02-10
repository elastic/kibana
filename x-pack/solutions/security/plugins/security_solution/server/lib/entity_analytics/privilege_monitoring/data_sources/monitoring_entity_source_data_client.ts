/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  MonitoringEntitySourceAttributes,
  MonitoringEntitySource,
  ListEntitySourcesRequestQuery,
  ListEntitySourcesResponse,
  Matcher,
} from '../../../../../common/api/entity_analytics';
import type { PartialMonitoringEntitySource } from '../types';
import { MonitoringEntitySourceDescriptorClient } from '../saved_objects';
import { areMatchersEqual, getDefaultMatchersForSource } from './matchers';

interface MonitoringEntitySourceDataClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  namespace: string;
}

export class MonitoringEntitySourceDataClient {
  private monitoringEntitySourceClient: MonitoringEntitySourceDescriptorClient;
  constructor(private readonly opts: MonitoringEntitySourceDataClientOpts) {
    this.monitoringEntitySourceClient = new MonitoringEntitySourceDescriptorClient({
      soClient: this.opts.soClient,
      namespace: this.opts.namespace,
    });
  }

  public async create(input: MonitoringEntitySourceAttributes): Promise<MonitoringEntitySource> {
    const source = await this.monitoringEntitySourceClient.create({
      ...input,
    });
    this.log('debug', 'Initializing MonitoringEntitySourceDataClient Saved Object');
    return source;
  }

  public async get(id: string): Promise<MonitoringEntitySource> {
    this.log('debug', `Getting Monitoring Entity Source Sync saved object with id: ${id}`);
    return this.monitoringEntitySourceClient.get(id);
  }

  public async update(update: PartialMonitoringEntitySource): Promise<MonitoringEntitySource> {
    this.log('debug', `Updating Monitoring Entity Source Sync saved object with id: ${update.id}`);
    const isMatcherUpdate = update.matchers !== undefined;
    const sanitizedMatchers = update.matchers?.map((matcher: Matcher) => ({
      fields: matcher.fields ?? [],
      values: matcher.values ?? [],
    }));

    let matchersModifiedByUser: boolean | undefined;
    if (isMatcherUpdate) {
      const existing = (await this.monitoringEntitySourceClient.get(
        update.id
      )) as MonitoringEntitySource & {
        matchersModifiedByUser?: boolean;
      };
      const isManaged = update.managed ?? existing.managed;

      if (isManaged) {
        const integrationName = update.integrationName ?? existing.integrationName;
        const sourceType = update.type ?? existing.type;
        const defaultMatchers = getDefaultMatchersForSource(sourceType, integrationName);
        if (!defaultMatchers) {
          this.log(
            'warn',
            `Missing default matchers for managed source ${update.id}; treating matchers as modified`
          );
          matchersModifiedByUser = true;
        } else {
          matchersModifiedByUser = !areMatchersEqual(sanitizedMatchers, defaultMatchers);
        }
      } else {
        // source not managed so we don't use default matchers to compare, fallback to existing matchers check
        matchersModifiedByUser = areMatchersEqual(sanitizedMatchers, existing.matchers)
          ? existing.matchersModifiedByUser ?? false
          : true;
      }
    }

    const sanitizedUpdate: PartialMonitoringEntitySource = {
      ...update,
      ...(isMatcherUpdate ? { matchersModifiedByUser: matchersModifiedByUser ?? false } : {}),
      matchers: sanitizedMatchers,
    };
    return this.monitoringEntitySourceClient.update(sanitizedUpdate);
  }

  public async delete(id: string) {
    this.log('debug', `Deleting Monitoring Entity Source Sync saved object with id: ${id}`);
    return this.monitoringEntitySourceClient.delete(id);
  }

  public async list(query: ListEntitySourcesRequestQuery): Promise<ListEntitySourcesResponse> {
    this.log('debug', 'Finding all Monitoring Entity Source Sync saved objects');
    return this.monitoringEntitySourceClient.list(query);
  }

  private log(level: Exclude<keyof Logger, 'get' | 'log' | 'isLevelEnabled'>, msg: string) {
    this.opts.logger[level](
      `[Monitoring Entity Source Sync][namespace: ${this.opts.namespace}] ${msg}`
    );
  }
}
