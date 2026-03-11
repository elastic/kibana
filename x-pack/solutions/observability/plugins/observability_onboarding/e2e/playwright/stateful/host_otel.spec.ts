/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from './fixtures/base_page';
import { assertEnv } from '../lib/assert_env';
import { assertDiscoverHasData, assertStreamHasData } from '../lib/validation_helpers';

test.beforeEach(async ({ page }) => {
  await page.goto(`${process.env.KIBANA_BASE_URL}/app/observabilityOnboarding`);
});

test('Otel Host', async ({
  page,
  onboardingHomePage,
  otelHostFlowPage,
  hostsOverviewPage,
  wiredStreamsSelector,
}) => {
  assertEnv(process.env.ARTIFACTS_FOLDER, 'ARTIFACTS_FOLDER is not defined.');

  const isLogsEssentialsMode = process.env.LOGS_ESSENTIALS_MODE === 'true';
  const useWiredStreams = process.env.USE_WIRED_STREAMS === 'true';
  const fileName = 'code_snippet_otel_host.sh';
  const outputPath = path.join(__dirname, '..', process.env.ARTIFACTS_FOLDER, fileName);

  await onboardingHomePage.selectHostUseCase();
  await onboardingHomePage.selectOtelHostQuickstart();

  const osName = process.env.OS_NAME || os.platform();
  await otelHostFlowPage.selectPlatform(osName);

  if (useWiredStreams) {
    await wiredStreamsSelector.selectWiredStreamsMode();
  }

  await otelHostFlowPage.copyCollectorDownloadSnippetToClipboard();
  const collectorDownloadSnippet = (await page.evaluate(
    'navigator.clipboard.readText()'
  )) as string;

  await otelHostFlowPage.copyCollectorStartSnippetToClipboard();
  const collectorStartSnippet = (await page.evaluate('navigator.clipboard.readText()')) as string;

  const codeSnippet = `${collectorDownloadSnippet}\n${collectorStartSnippet} > collector-output.log 2>&1 &`;

  /**
   * Ensemble story watches for the code snippet file
   * to be created and then executes it
   */
  fs.writeFileSync(outputPath, codeSnippet);

  /**
   * There is no explicit data ingest indication
   * in the flow, so we need to rely on a timeout.
   * 3 minutes should be enough for the collector
   * to initialize and start ingesting data.
   */
  await page.waitForTimeout(3 * 60000);

  /**
   * Wired streams only reroutes logs (to logs.otel); metrics and traces are
   * unaffected. So for wired streams we validate log delivery via Discover and
   * the Streams page, and intentionally skip the Hosts Overview dashboard
   * check. Dashboard validation is already covered by the non-wired test
   * variants.
   *
   * Both "wired streams" and "wired streams + logs essentials" fall into this
   * single branch because the validation path is identical for both.
   */
  if (useWiredStreams) {
    await otelHostFlowPage.clickLogsExplorationCTA();
    await assertDiscoverHasData(page, { assertHitCount: true });
    await assertStreamHasData(page, 'logs.otel');
  } else if (!isLogsEssentialsMode) {
    await otelHostFlowPage.clickHostsOverviewCTA();
    const hostname = os.hostname();
    await hostsOverviewPage.assertHostCpuNotEmpty(hostname);
  } else {
    await otelHostFlowPage.clickLogsExplorationCTA();
    await assertDiscoverHasData(page);
  }
});
