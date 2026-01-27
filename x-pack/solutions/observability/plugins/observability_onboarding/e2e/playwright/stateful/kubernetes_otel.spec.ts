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
import { OtelKubernetesOverviewDashboardPage } from './pom/pages/otel_kubernetes_overview_dashboard.page';
import { ApmServiceInventoryPage } from './pom/pages/apm_service_inventory.page';

/**
 * In case you need to run this test locally, you can use https://github.com/elastic/oblt-reference-stack
 * to spin up a local k8s cluster with the required resources.
 */

test.beforeEach(async ({ page }) => {
  await page.goto(`${process.env.KIBANA_BASE_URL}/app/observabilityOnboarding`);
});

/**
 * These constants are used by Ensemble test
 * when creating the app container. They should
 * be kept in sync.
 */
const INSTRUMENTED_APP_CONTAINER_NAMESPACE = 'java';
const INSTRUMENTED_APP_NAME = 'java-app';

test('Otel Kubernetes', async ({ page, onboardingHomePage, otelKubernetesFlowPage }) => {
  assertEnv(process.env.ARTIFACTS_FOLDER, 'ARTIFACTS_FOLDER is not defined.');

  const isLogsEssentialsMode = process.env.LOGS_ESSENTIALS_MODE === 'true';
  const fileName = 'code_snippet_otel_kubernetes.sh';
  const outputPath = path.join(__dirname, '..', process.env.ARTIFACTS_FOLDER, fileName);

  await onboardingHomePage.selectKubernetesUseCase();
  await onboardingHomePage.selectOtelKubernetesQuickstart();

  await otelKubernetesFlowPage.copyHelmRepositorySnippetToClipboard();
  const helmRepoSnippet = (await page.evaluate('navigator.clipboard.readText()')) as string;

  await otelKubernetesFlowPage.copyInstallStackSnippetToClipboard();
  const installStackSnippet = (await page.evaluate('navigator.clipboard.readText()')) as string;

  let codeSnippet: string;

  if (!isLogsEssentialsMode) {
    /**
     * Getting the snippets and replacing placeholder
     * with the values used by Ensemble
     */
    await otelKubernetesFlowPage.switchInstrumentationInstructions('java');
    const annotateAllResourceSnippet = (
      await otelKubernetesFlowPage.getAnnotateAllResourceSnippet()
    )?.replace('my-namespace', INSTRUMENTED_APP_CONTAINER_NAMESPACE);
    const restartDeploymentSnippet = (await otelKubernetesFlowPage.getRestartDeploymentSnippet())
      ?.split('\n')[0]
      ?.replace('myapp', INSTRUMENTED_APP_NAME)
      ?.replace('my-namespace', INSTRUMENTED_APP_CONTAINER_NAMESPACE);
    /**
     * Adding timeout so Ensemble waits for the
     * pods to be created before instrumenting the app
     */
    const sleepSnippet = `sleep 120`;

    codeSnippet = `${helmRepoSnippet}\n${installStackSnippet}\n${sleepSnippet}\n${annotateAllResourceSnippet}\n${restartDeploymentSnippet}`;
  } else {
    codeSnippet = `${helmRepoSnippet}\n${installStackSnippet}`;
  }

  /**
   * Ensemble story watches for the code snippet file
   * to be created and then executes it
   */
  fs.writeFileSync(outputPath, codeSnippet);

  /**
   * There is no explicit data ingest indication
   * in the flow, so we need to rely on a timeout.
   * 5 minutes should be enough for the stack to be
   * created and to start pushing data.
   */
  await page.waitForTimeout(5 * 60000);

  if (!isLogsEssentialsMode) {
    const otelKubernetesOverviewDashboardPage = new OtelKubernetesOverviewDashboardPage(
      await otelKubernetesFlowPage.openClusterOverviewDashboardInNewTab()
    );

    await otelKubernetesOverviewDashboardPage.assertNodesPanelNotEmpty();

    const apmServiceInventoryPage = new ApmServiceInventoryPage(
      await otelKubernetesFlowPage.openServiceInventoryInNewTab()
    );

    const serviceTestId = 'serviceLink_opentelemetry/java/elastic';

    await apmServiceInventoryPage.page.getByTestId(serviceTestId).click();
    await apmServiceInventoryPage.assertTransactionExists();
  } else {
    const discoverValidation =
      await otelKubernetesFlowPage.clickExploreLogsAndGetDiscoverValidation();
    await discoverValidation.waitForDiscoverToLoad();
    await discoverValidation.assertHasAnyLogData();
  }
});
