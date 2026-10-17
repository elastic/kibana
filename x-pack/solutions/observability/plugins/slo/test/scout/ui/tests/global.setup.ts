/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, KbnClient, ScoutLogger } from '@kbn/scout-oblt';
import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../../../common/constants';
import { SLO_COMPOSITE_ENABLED } from '../../../../common/feature_flags';

const SLO_NAME = 'Test Stack SLO';
const TRANSFORM_READY_TIMEOUT_MS = 90_000;
const TRANSFORM_POLL_INTERVAL_MS = 1_500;
const COMPOSITE_SLO_PATH = '/api/observability/slo_composites';
const FLAG_PROPAGATION_MS = 15_000;
const FLAG_READY_TIMEOUT_MS = 60_000;
const FLAG_POLL_INTERVAL_MS = 1_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const deleteExistingTestSlos = async (kbnClient: KbnClient) => {
  const { data } = await kbnClient.request<{ results: Array<{ id: string }> }>({
    method: 'GET',
    path: `/api/observability/slos?kqlQuery=${encodeURIComponent(`slo.name:"${SLO_NAME}"`)}`,
  });
  for (const slo of data.results ?? []) {
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/observability/slos/${slo.id}`,
      ignoreErrors: [404],
    });
  }
};

// The override applies in memory only on the node that handled the PUT and reaches the other
// Kibana instances from the persisted saved object on their next 10s config poll, so hold that
// window out before confirming with a composite route (they answer 404 while the flag is off).
const waitForCompositeSloFlag = async (
  kbnClient: KbnClient,
  enabledAt: number,
  log: ScoutLogger
) => {
  await sleep(Math.max(0, enabledAt + FLAG_PROPAGATION_MS - Date.now()));

  const deadline = Date.now() + FLAG_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const { status } = await kbnClient.request({
      method: 'GET',
      path: COMPOSITE_SLO_PATH,
      ignoreErrors: [404],
    });
    if (status === 200) {
      log.info(`Composite SLO feature flag is effective on ${COMPOSITE_SLO_PATH}`);
      return;
    }
    await sleep(FLAG_POLL_INTERVAL_MS);
  }

  throw new Error(
    `Composite SLO feature flag did not become effective within ${FLAG_READY_TIMEOUT_MS}ms: GET ${COMPOSITE_SLO_PATH} still answers 404`
  );
};

const scheduleNowAndWaitForProgress = async (
  esClient: EsClient,
  transformId: string,
  log: ScoutLogger
) => {
  await esClient.transform.scheduleNowTransform({ transform_id: transformId });
  const deadline = Date.now() + TRANSFORM_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const stats = await esClient.transform.getTransformStats({ transform_id: transformId });
    const processed = stats.transforms[0]?.stats?.documents_processed ?? 0;
    if (processed > 0) {
      log.info(`SLO transform ${transformId} processed ${processed} documents`);
      return;
    }
    // Re-trigger periodically: the very first scheduleNow can fire before the
    // transform has data to read, leaving documents_processed at 0 until the
    // next natural tick. Nudging it again keeps the wait short.
    await esClient.transform
      .scheduleNowTransform({ transform_id: transformId })
      .catch(() => undefined);
    await sleep(TRANSFORM_POLL_INTERVAL_MS);
  }
  throw new Error(
    `SLO transform ${transformId} did not process any document within ${TRANSFORM_READY_TIMEOUT_MS}ms`
  );
};

globalSetupHook(
  'Setup environment for SLO tests',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ sloData, apiServices, esClient, kbnClient, log }) => {
    // Enabled up front so the propagation window overlaps the data seeding below instead of adding
    // to it, and reverted in `global.teardown.ts` so it doesn't leak into the next config.
    await apiServices.core.settings({
      'feature_flags.overrides': { [SLO_COMPOSITE_ENABLED]: true },
    });
    const flagEnabledAt = Date.now();

    await sloData.generateSloData();

    // Repeated local runs accumulate identically-named SLOs in the same cluster.
    // Drop any leftover "Test Stack SLO" before re-seeding so specs see exactly one
    // definition with up-to-date transforms.
    await deleteExistingTestSlos(kbnClient);

    const created = (await sloData.addSLO()) as { id: string } | undefined;
    const sloId = created?.id;
    if (sloId) {
      // Continuous SLO transforms run on a 1-minute schedule by default which makes
      // the overview embeddable wait noticeably for charts to render on a fresh setup.
      // Drive the rollup transform first (it reads source data); once it has produced
      // rollup docs, drive the summary transform (which reads from the rollup index)
      // so the embeddable's summary query has data by the time specs run.
      try {
        await scheduleNowAndWaitForProgress(esClient, getSLOTransformId(sloId, 1), log);
        await scheduleNowAndWaitForProgress(esClient, getSLOSummaryTransformId(sloId, 1), log);
      } catch (err) {
        log.warning(`SLO transform fast-forward failed: ${(err as Error).message}`);
      }
    } else {
      log.warning('Skipping transform fast-forward: SLO id missing from addSLO() response');
    }

    await waitForCompositeSloFlag(kbnClient, flagEnabledAt, log);
  }
);
