/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, KbnClient, ScoutLogger } from '@kbn/scout-oblt';
import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../../../common/constants';

const SLO_NAME = 'Test Stack SLO';
const TRANSFORM_READY_TIMEOUT_MS = 90_000;
const TRANSFORM_POLL_INTERVAL_MS = 1_500;

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
  async ({ sloData, esClient, kbnClient, log }) => {
    await sloData.generateSloData();

    // Repeated local runs accumulate identically-named SLOs in the same cluster.
    // Drop any leftover "Test Stack SLO" before re-seeding so specs see exactly one
    // definition with up-to-date transforms.
    await deleteExistingTestSlos(kbnClient);

    const created = (await sloData.addSLO()) as { id: string } | undefined;
    const sloId = created?.id;
    if (!sloId) {
      log.warning('Skipping transform fast-forward: SLO id missing from addSLO() response');
      return;
    }

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
  }
);
