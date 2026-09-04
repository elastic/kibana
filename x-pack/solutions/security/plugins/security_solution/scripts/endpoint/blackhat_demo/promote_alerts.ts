/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { IndicesGetMappingResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import {
  resolveEndpointSecurityRule,
  runAlertJobs,
  type AlertMode,
  type PreviewTuning,
} from '../../data/lib/alert_runner';
import { ensurePrebuiltRulesInstalled } from '../../data/lib/prebuilt_rules';
import { formatError, getStatusCode } from '../../data/lib/type_guards';

const ENDPOINT_ALERTS_INDEX = 'logs-endpoint.alerts-default';

const ensureDetectionsInitialized = async ({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
}): Promise<void> => {
  try {
    await kbnClient.request({
      method: 'POST',
      path: '/api/detection_engine/index',
      headers: {
        'kbn-xsrf': 'true',
        'elastic-api-version': '2023-10-31',
      },
    });
  } catch (e) {
    log.warning(
      `Detections index initialization request failed (may be missing privileges); continuing. ${formatError(
        e
      )}`
    );
  }
};

const alertsDataStreamExists = async ({
  esClient,
  spaceId,
}: {
  esClient: Client;
  spaceId: string;
}): Promise<boolean> => {
  const dest = `.alerts-security.alerts-${spaceId}`;
  try {
    await esClient.indices.getDataStream({ name: dest });
    return true;
  } catch (e) {
    const status = getStatusCode(e);
    if (status === 404) {
      try {
        return await esClient.indices.exists({ index: dest });
      } catch {
        return false;
      }
    }
    try {
      return await esClient.indices.exists({ index: dest });
    } catch {
      throw e;
    }
  }
};

const ensurePreviewAlertsIndex = async ({
  esClient,
  log,
  spaceId,
}: {
  esClient: Client;
  log: ToolingLog;
  spaceId: string;
}): Promise<void> => {
  const previewAlias = `.preview.alerts-security.alerts-${spaceId}`;
  const previewInternalAlias = `.internal.preview.alerts-security.alerts-${spaceId}`;
  const previewBackingIndex = `${previewInternalAlias}-000001`;

  const exists = await esClient.indices.exists({ index: previewAlias });
  if (exists) return;

  const resolveBackingIndexFromAlias = async (alias: string): Promise<string | undefined> => {
    try {
      const resp = await esClient.indices.getAlias({ name: alias });
      const indices = Object.keys(resp);
      return indices.sort()[0];
    } catch {
      return undefined;
    }
  };

  const realAlertsBackingIndex =
    (await resolveBackingIndexFromAlias(`.internal.alerts-security.alerts-${spaceId}`)) ??
    (await resolveBackingIndexFromAlias(`.alerts-security.alerts-${spaceId}`));

  if (!realAlertsBackingIndex) {
    log.warning(
      `Preview alerts index ${previewAlias} is missing, but cannot recreate it because the real Security alerts backing index could not be resolved. ` +
        `Initialize detections (Security app) and re-run.`
    );
    return;
  }

  try {
    const mappingResp: IndicesGetMappingResponse = await esClient.indices.getMapping({
      index: realAlertsBackingIndex,
    });
    const mapping = mappingResp[realAlertsBackingIndex]?.mappings;

    log.info(`Recreating missing preview alerts backing index: ${previewBackingIndex}`);
    await esClient.indices.create({
      index: previewBackingIndex,
      settings: {
        'index.mapping.total_fields.limit': '6000',
        index: { hidden: true },
      },
      mappings: mapping,
      aliases: {
        [previewAlias]: {},
        [previewInternalAlias]: {},
      },
    });
  } catch (e) {
    log.warning(`Failed to recreate preview alerts index ${previewAlias}: ${formatError(e)}`);
  }
};

/**
 * Mint Detection Engine alerts from seeded Elastic Defend docs so Attack Discovery
 * has something to cluster. Preview mode copies immediately; live mode only enables
 * the Endpoint Security rule.
 */
export const promoteEndpointAlerts = async ({
  esClient,
  kbnClient,
  log,
  spaceId,
  alertMode,
  startMs,
  endMs,
}: {
  esClient: Client;
  kbnClient: KbnClient;
  log: ToolingLog;
  spaceId: string;
  alertMode: AlertMode;
  startMs: number;
  endMs: number;
}): Promise<number> => {
  if (alertMode === 'none') {
    log.info('alert-mode=none: skipping Detection Engine promotion.');
    return 0;
  }

  try {
    await ensurePrebuiltRulesInstalled({ kbnClient, log });
  } catch (e) {
    log.warning(`Prebuilt rule install/status check failed; continuing. ${formatError(e)}`);
  }

  await ensureDetectionsInitialized({ kbnClient, log });
  await ensurePreviewAlertsIndex({ esClient, log, spaceId });

  const alertsReady = await alertsDataStreamExists({ esClient, spaceId });
  if (!alertsReady && alertMode === 'preview') {
    log.warning(
      `Security alerts destination (.alerts-security.alerts-${spaceId}) does not exist yet. ` +
        `Open the Security app once to initialize detections, then re-run with --clean.`
    );
    return 0;
  }

  const endpointRule = await resolveEndpointSecurityRule({
    kbnClient,
    log,
    index: [ENDPOINT_ALERTS_INDEX],
    ruleFrom: 'now-1d',
  });
  if (!endpointRule) {
    log.warning('Could not resolve Endpoint Security rule; skipping alert promotion.');
    return 0;
  }

  const nowMs = Date.now();
  const previewWindowSeconds = Math.max(60, Math.ceil((nowMs - startMs) / 1000) + 60);
  const tuning: PreviewTuning = {
    interval: '1h',
    invocationCount: Math.max(1, Math.ceil(previewWindowSeconds / 3600)),
    previewWindowSeconds,
    // Rule preview executions are anchored at "now" so they see the freshly indexed docs.
    timeframeEndIso: new Date(nowMs).toISOString(),
    // Copied detection-alert timestamps stay inside the kill-chain window.
    timestampRange: { startMs, endMs: Math.max(endMs, startMs + 60_000) },
  };

  const results = await runAlertJobs({
    esClient,
    kbnClient,
    log,
    spaceId,
    alertMode,
    jobs: [
      {
        ruleRef: endpointRule,
        index: [ENDPOINT_ALERTS_INDEX],
        expectAlerts: true,
        label: 'Endpoint Security (BlackHat forensic demo)',
      },
    ],
    tuning,
  });

  return results.reduce((sum, row) => sum + row.count, 0);
};
