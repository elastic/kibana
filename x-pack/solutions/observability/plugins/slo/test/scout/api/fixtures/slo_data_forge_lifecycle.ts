/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { cleanup, generate, type PartialConfig } from '@kbn/data-forge';
import type { KbnClient, ScoutLogger } from '@kbn/scout-oblt';

export const SLO_FTR_DATA_FORGE_CONFIG: PartialConfig = {
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

export const SLO_FTR_DATA_VIEW_ID = 'data-view-id';
/** Alternate id for suites that need an isolated data view (e.g. health scan). */
export const SLO_FTR_DATA_VIEW_ID_HEALTH_SCAN = 'data-view-id-health-scan';
export const SLO_FTR_DATA_VIEW_TITLE = 'kbn-data-forge-fake_hosts.fake_hosts-*';

export async function installSloFtrDataForge(esClient: Client, log: ScoutLogger): Promise<void> {
  await generate({ client: esClient, config: SLO_FTR_DATA_FORGE_CONFIG, logger: log });
}

export async function removeSloFtrDataForge(esClient: Client, log: ScoutLogger): Promise<void> {
  await cleanup({ client: esClient, config: SLO_FTR_DATA_FORGE_CONFIG, logger: log });
}

export async function createSloFtrDataView(
  kbnClient: KbnClient,
  dataViewId: string = SLO_FTR_DATA_VIEW_ID
): Promise<void> {
  await kbnClient.request({
    method: 'POST',
    path: '/api/content_management/rpc/create',
    body: {
      contentTypeId: 'index-pattern',
      data: {
        fieldAttrs: '{}',
        title: SLO_FTR_DATA_VIEW_TITLE,
        timeFieldName: '@timestamp',
        sourceFilters: '[]',
        fields: '[]',
        fieldFormatMap: '{}',
        typeMeta: '{}',
        runtimeFieldMap: '{}',
        name: SLO_FTR_DATA_VIEW_TITLE,
      },
      options: { id: dataViewId },
      version: 1,
    },
  });
}

export async function deleteSloFtrDataView(
  kbnClient: KbnClient,
  dataViewId: string = SLO_FTR_DATA_VIEW_ID
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

/** Dependencies passed from Scout `beforeAll` / `afterAll` hooks (same shape as FTR suite setup/teardown). */
export interface SloFtrDataForgeSuiteDeps {
  apiServices: { slo: { deleteAllSLOs(): Promise<void> } };
  esClient: Client;
  kbnClient: KbnClient;
  log: ScoutLogger;
}

/** Install FTR data forge, default SLO data view, and clear SLOs — call from `beforeAll`. */
export async function setupSloFtrDataForgeSuite(deps: SloFtrDataForgeSuiteDeps): Promise<void> {
  await installSloFtrDataForge(deps.esClient, deps.log);
  await createSloFtrDataView(deps.kbnClient);
  await deps.apiServices.slo.deleteAllSLOs();
}

/** Remove SLOs, data view, and data forge — call from `afterAll`. */
export async function teardownSloFtrDataForgeSuite(deps: SloFtrDataForgeSuiteDeps): Promise<void> {
  await deps.apiServices.slo.deleteAllSLOs();
  await deleteSloFtrDataView(deps.kbnClient);
  await removeSloFtrDataForge(deps.esClient, deps.log);
}
