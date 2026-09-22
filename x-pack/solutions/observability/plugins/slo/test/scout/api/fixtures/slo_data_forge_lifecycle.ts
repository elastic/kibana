/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { cleanup, generate, type PartialConfig } from '@kbn/data-forge';
import type { KbnClient, ScoutLogger } from '@kbn/scout-oblt';

import type { SloLifecycleApi } from '../services/slo_lifecycle_api_service';

/** Programmatic data-forge config for SLO API tests (`fake_hosts` dataset). */
export const SLO_SCOUT_HOSTS_DATA_FORGE_CONFIG: PartialConfig = {
  schedule: [
    {
      template: 'good',
      start: 'now-15m',
      end: 'now+5m',
      metrics: [
        { name: 'system.cpu.user.pct', method: 'linear', start: 2.5, end: 2.5 },
        { name: 'system.cpu.total.pct', method: 'linear', start: 0.5, end: 0.5 },
        { name: 'system.cpu.total.norm.pct', method: 'linear', start: 0.8, end: 0.8 },
      ],
    },
  ],
  indexing: { dataset: 'fake_hosts', eventsPerCycle: 1 },
};

export const SLO_SCOUT_HOSTS_DATA_VIEW_ID = 'data-view-id';
export const SLO_SCOUT_HOSTS_DATA_VIEW_TITLE = 'kbn-data-forge-fake_hosts.fake_hosts-*';

export async function installSloScoutHostsDataForge(
  esClient: Client,
  log: ScoutLogger
): Promise<void> {
  await generate({ client: esClient, config: SLO_SCOUT_HOSTS_DATA_FORGE_CONFIG, logger: log });
}

export async function removeSloScoutHostsDataForge(
  esClient: Client,
  log: ScoutLogger
): Promise<void> {
  await cleanup({ client: esClient, config: SLO_SCOUT_HOSTS_DATA_FORGE_CONFIG, logger: log });
}

export async function createSloScoutHostsDataView(
  kbnClient: KbnClient,
  dataViewId: string = SLO_SCOUT_HOSTS_DATA_VIEW_ID
): Promise<void> {
  await kbnClient.request({
    method: 'POST',
    path: '/api/content_management/rpc/create',
    body: {
      contentTypeId: 'index-pattern',
      data: {
        fieldAttrs: '{}',
        title: SLO_SCOUT_HOSTS_DATA_VIEW_TITLE,
        timeFieldName: '@timestamp',
        sourceFilters: '[]',
        fields: '[]',
        fieldFormatMap: '{}',
        typeMeta: '{}',
        runtimeFieldMap: '{}',
        name: SLO_SCOUT_HOSTS_DATA_VIEW_TITLE,
      },
      options: { id: dataViewId },
      version: 1,
    },
  });
}

export async function deleteSloScoutHostsDataView(
  kbnClient: KbnClient,
  dataViewId: string = SLO_SCOUT_HOSTS_DATA_VIEW_ID
): Promise<void> {
  await kbnClient.request({
    method: 'POST',
    path: '/api/content_management/rpc/delete',
    body: {
      contentTypeId: 'index-pattern',
      id: dataViewId,
      options: { force: true },
      version: 1,
    },
  });
}

export interface SloHostsDataForgeDeps {
  apiServices: { slo: SloLifecycleApi };
  esClient: Client;
  kbnClient: KbnClient;
  log: ScoutLogger;
}

/** Install hosts data forge, default SLO data view, clear SLOs — call from `beforeAll`. */
export async function setupSloHostsDataForge(deps: SloHostsDataForgeDeps): Promise<void> {
  await installSloScoutHostsDataForge(deps.esClient, deps.log);
  await createSloScoutHostsDataView(deps.kbnClient);
  await deps.apiServices.slo.deleteAllSLOs();
}

/** Remove SLOs, data view, hosts forge — call from `afterAll`. */
export async function teardownSloHostsDataForge(deps: SloHostsDataForgeDeps): Promise<void> {
  await deps.apiServices.slo.deleteAllSLOs();
  await deleteSloScoutHostsDataView(deps.kbnClient);
  await removeSloScoutHostsDataForge(deps.esClient, deps.log);
}
