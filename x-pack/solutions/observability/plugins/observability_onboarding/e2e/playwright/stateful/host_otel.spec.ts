/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'node:fs';
import path from 'node:path';
import { test } from './fixtures/base_page';
import { assertEnv } from '../lib/assert_env';

test.beforeEach(async ({ page }) => {
  await page.goto(`${process.env.KIBANA_BASE_URL}/app/observabilityOnboarding`);
});

test('Otel Host', async ({ page, onboardingHomePage, otelHostFlowPage, hostsOverviewPage }) => {
  assertEnv(process.env.ARTIFACTS_FOLDER, 'ARTIFACTS_FOLDER is not defined.');

  const fileName = 'code_snippet_otel_host.sh';
  const outputPath = path.join(__dirname, '..', process.env.ARTIFACTS_FOLDER, fileName);

  await onboardingHomePage.selectHostUseCase();
  await onboardingHomePage.selectOtelHostQuickstart();

  await otelHostFlowPage.copyCollectorDownloadSnippetToClipboard();
  const collectorDownloadSnippet = (await page.evaluate(
    'navigator.clipboard.readText()'
  )) as string;

  await otelHostFlowPage.copyCollectorStartSnippetToClipboard();
  const collectorStartSnippet = (await page.evaluate('navigator.clipboard.readText()')) as string;

  const codeSnippet = `${collectorDownloadSnippet}\n${collectorStartSnippet}`;

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

  await otelHostFlowPage.clickHostsOverviewCTA();
  await hostsOverviewPage.assertCpuPercentageNotEmpty();
});
