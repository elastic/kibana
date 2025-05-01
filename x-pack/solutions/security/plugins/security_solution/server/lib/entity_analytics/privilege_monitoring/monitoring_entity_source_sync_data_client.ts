/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  MonitoringEntitySourceDescriptor,
  MonitoringEntitySourceResponse,
} from '../../../../common/api/entity_analytics/privilege_monitoring/monitoring_entity_source/monitoring_entity_source.gen';
import { MonitoringEntitySourceDescriptorClient } from './saved_object/monitoring_entity_source';

interface MonitoringEntitySourceSyncDataClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  namespace: string;
}

export class MonitoringEntitySourceSyncDataClient {
  private monitoringEntitySourceSyncClient: MonitoringEntitySourceDescriptorClient;
  constructor(private readonly opts: MonitoringEntitySourceSyncDataClientOpts) {
    this.monitoringEntitySourceSyncClient = new MonitoringEntitySourceDescriptorClient({
      soClient: this.opts.soClient,
      namespace: this.opts.namespace,
    });
  }

  public async init(
    input: MonitoringEntitySourceDescriptor
  ): Promise<MonitoringEntitySourceResponse> {
    const descriptor = await this.monitoringEntitySourceSyncClient.create(input);
    this.log('debug', 'Initializing MonitoringEntitySourceSyncDataClient Saved Object');
    return descriptor;
  }

  public async get(): Promise<MonitoringEntitySourceResponse> {
    this.log('debug', 'Getting Monitoring Entity Source Sync saved object');
    return this.monitoringEntitySourceSyncClient.get();
  }

  public async update(update: Partial<MonitoringEntitySourceResponse>) {
    this.log('debug', 'Updating Monitoring Entity Source Sync saved object');

    const sanitizedUpdate = {
      ...update,
      matchers: update.matchers?.map((matcher) => ({
        fields: matcher.fields ?? [],
        values: matcher.values ?? [],
      })),
    };

    return this.monitoringEntitySourceSyncClient.update(sanitizedUpdate);
  }

  public async delete() {
    this.log('debug', 'Deleting Monitoring Entity Source Sync saved object');
    return this.monitoringEntitySourceSyncClient.delete();
  }

  private log(level: Exclude<keyof Logger, 'get' | 'log' | 'isLevelEnabled'>, msg: string) {
    this.opts.logger[level](
      `[Monitoring Entity Source Sync][namespace: ${this.opts.namespace}] ${msg}`
    );
  }
}
