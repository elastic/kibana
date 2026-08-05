/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page } from '@playwright/test';
import { DiscoverValidationPage } from '../stateful/pom/pages/discover_validation.page';
import { StreamsValidationPage } from '../stateful/pom/pages/streams_validation.page';

export async function assertDiscoverHasData(
  page: Page,
  { assertHitCount = false } = {}
): Promise<void> {
  const discoverValidation = new DiscoverValidationPage(page);
  await discoverValidation.waitForDiscoverToLoad();
  await discoverValidation.assertHasAnyLogData();
  if (assertHitCount) {
    await discoverValidation.assertHitCountGreaterThanZero();
  }
}

export async function assertStreamHasData(
  page: Page,
  streamName: string,
  { timeout = 4 * 60000 }: { timeout?: number } = {}
): Promise<void> {
  // logs.ecs materializes lazily on first ingest, so poll until data lands rather than assume a
  // fixed delay. Separate page keeps the caller's onboarding page intact for later checks.
  const streamsPage = await page.context().newPage();
  try {
    await expect(async () => {
      await streamsPage.goto(`${process.env.KIBANA_BASE_URL}/app/streams`);
      const streamsValidation = new StreamsValidationPage(streamsPage);
      await streamsValidation.waitForStreamsToLoad();
      await streamsValidation.assertStreamDocCountGreaterThanZero(streamName);
    }).toPass({ timeout });
  } catch (err) {
    const diag = await fetchStreamsStateDiag(page, streamName);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\n\n${diag}`);
  } finally {
    await streamsPage.close();
  }
}

async function fetchStreamsStateDiag(page: Page, streamName: string): Promise<string> {
  const base = process.env.KIBANA_BASE_URL;
  const headers = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
  try {
    const [listResp, countsResp] = await Promise.all([
      page.request.get(`${base}/api/streams`, { headers }),
      page.request.get(`${base}/internal/streams/doc_counts/total`, { headers }),
    ]);
    const streamDefs: Array<{ name: string }> = listResp.ok()
      ? (await listResp.json()).streams ?? []
      : [];
    const docCounts: Array<{ stream: string; count: number }> = countsResp.ok()
      ? await countsResp.json()
      : [];

    const logsOnly = (name: string) => name.startsWith('logs');
    return (
      `Diagnostic state after ${streamName} timeout:\n` +
      `  stream definitions (logs.*): ${JSON.stringify(
        streamDefs.filter((s) => logsOnly(s.name)).map((s) => s.name)
      )}\n` +
      `  doc counts (logs.*): ${JSON.stringify(docCounts.filter((s) => logsOnly(s.stream)))}`
    );
  } catch (diagErr) {
    return `(could not fetch diagnostic state: ${diagErr})`;
  }
}
