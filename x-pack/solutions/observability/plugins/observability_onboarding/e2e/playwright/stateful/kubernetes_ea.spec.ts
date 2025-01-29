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

test('Kubernetes EA', async ({
  page,
  onboardingHomePage,
  kubernetesEAFlowPage,
  kubernetesOverviewDashboardPage,
}) => {
  assertEnv(process.env.ARTIFACTS_FOLDER, 'ARTIFACTS_FOLDER is not defined.');

  const fileName = 'code_snippet_kubernetes.sh';
  const outputPath = path.join(__dirname, '..', process.env.ARTIFACTS_FOLDER, fileName);

  await onboardingHomePage.selectKubernetesUseCase();
  await onboardingHomePage.selectKubernetesQuickstart();

  await kubernetesEAFlowPage.assertVisibilityCodeBlock();
  await kubernetesEAFlowPage.copyToClipboard();

  const clipboardData = (await page.evaluate('navigator.clipboard.readText()')) as string;
  /**
   * The page waits for the browser window to loose
   * focus as a signal to start checking for incoming data
   */
  await page.evaluate('window.dispatchEvent(new Event("blur"))');

  /**
   * Ensemble story watches for the code snippet file
   * to be created and then executes it
   */
  fs.writeFileSync(outputPath, clipboardData);

  await kubernetesEAFlowPage.assertReceivedDataIndicatorKubernetes();

  /**
   * There might be a case that dashboard still does not show
   * the data even though it was ingested already. This usually
   * happens during the test when navigation from the onboarding
   * flow to the dashboard happens almost immediately.
   * Having a timeout before going to the dashboard "solves"
   * the issue. 2 minutes is generous and should be more then enough
   * for the data to propagate everywhere.
   */
  await page.waitForTimeout(2 * 60000);

  await kubernetesEAFlowPage.clickKubernetesAgentCTA();

  await kubernetesOverviewDashboardPage.assertNodesPanelNotEmpty();
});
