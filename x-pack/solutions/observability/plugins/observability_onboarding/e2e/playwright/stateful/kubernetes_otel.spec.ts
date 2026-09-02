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
import { assertDiscoverHasData } from '../lib/validation_helpers';

/**
 * In case you need to run this test locally, you can use https://github.com/elastic/oblt-reference-stack
 * to spin up a local k8s cluster with the required resources.
 */

/**
 * Retries are disabled for this spec because each retry remounts the
 * onboarding flow and mints a fresh onboardingId, but Ensemble runs the
 * code snippet (helm install) only once — with the first attempt's id.
 * Subsequent retries poll has-data for an id the collector was never
 * configured with, so they can never pass and only burn the step budget.
 */
test.describe.configure({ retries: 0 });

test.beforeEach(async ({ page, onboardingHomePage }) => {
  await page.goto(`${process.env.KIBANA_BASE_URL}/app/observabilityOnboarding`);
  await onboardingHomePage.maybeClickIntroducingAIAgentModalContinueBtn();
});

/**
 * These constants are used by Ensemble test
 * when creating the app container. They should
 * be kept in sync.
 */
const INSTRUMENTED_APP_CONTAINER_NAMESPACE = 'java';
const INSTRUMENTED_APP_NAME = 'java-app';

test('Otel Kubernetes', async ({ page, onboardingHomePage, otelKubernetesFlowPage }) => {
  /**
   * Cold GKE nodes require pulling the EDOT daemon-collector image (~6 min),
   * on top of helm install, operator + daemon-collector readiness waits, and
   * java-app rollout. 20 min covers: ~30s (helm + operator) + ~6 min (image
   * pull + daemonset rollout) + ~1 min (connect + ingest) + APM/dashboard
   * assertions.
   */
  test.setTimeout(20 * 60_000);

  assertEnv(process.env.ARTIFACTS_FOLDER, 'ARTIFACTS_FOLDER is not defined.');

  const isLogsEssentialsMode = process.env.LOGS_ESSENTIALS_MODE === 'true';
  const fileName = 'code_snippet_otel_kubernetes.sh';
  const outputPath = path.join(__dirname, '..', process.env.ARTIFACTS_FOLDER, fileName);

  await onboardingHomePage.waitForLanding();
  await onboardingHomePage.selectKubernetesOtel();

  const helmRepoSnippet = (await otelKubernetesFlowPage.getHelmRepositorySnippet()) ?? '';

  await otelKubernetesFlowPage.copyInstallStackSnippetToClipboard();
  const installStackSnippet = (await page.evaluate('navigator.clipboard.readText()')) as string;

  let codeSnippet: string;

  if (!isLogsEssentialsMode) {
    /**
     * Getting the snippets and replacing placeholder
     * with the values used by Ensemble
     */
    await otelKubernetesFlowPage.switchInstrumentationInstructions('java');
    await otelKubernetesFlowPage.selectNamespaceInstrumentationInstructions();
    const annotateAllResourceSnippet = (
      await otelKubernetesFlowPage.getAnnotateAllResourceSnippet()
    )?.replace('my-namespace', INSTRUMENTED_APP_CONTAINER_NAMESPACE);
    const restartDeploymentSnippet = (await otelKubernetesFlowPage.getRestartDeploymentSnippet())
      ?.split('\n')[0]
      ?.replace('myapp', INSTRUMENTED_APP_NAME)
      ?.replace('my-namespace', INSTRUMENTED_APP_CONTAINER_NAMESPACE);
    /**
     * Wait for the OTel operator, the gateway collector, AND the
     * daemon-collector DaemonSet before annotating and restarting the
     * java-app.
     *
     * Operator readiness gates the mutating webhook (instrumentation
     * injection). Gateway readiness matters because ALL data (logs, metrics,
     * traces) is exported daemon -> gateway -> Elastic; if the gateway never
     * becomes ready (e.g. its 2x500Mi replicas are unschedulable on a small
     * cluster), no data reaches Elasticsearch at all while the daemon still
     * looks healthy. Daemon-collector readiness ensures its OTLP endpoint
     * (port 4318) is up before the java-app starts: on cold nodes the image
     * pull takes ~6 min, and the OTel Java agent will not automatically
     * reconnect if the endpoint was unavailable at its own startup.
     */
    const collectorReadinessSnippet = `kubectl rollout status --watch --timeout=300s deployment/opentelemetry-kube-stack-opentelemetry-operator --namespace opentelemetry-operator-system
kubectl rollout status --watch --timeout=300s deployment/opentelemetry-kube-stack-gateway-collector --namespace opentelemetry-operator-system
kubectl rollout status --watch --timeout=660s daemonset/opentelemetry-kube-stack-daemon-collector --namespace opentelemetry-operator-system`;
    const instrumentedAppReadinessSnippet = `kubectl rollout status --watch --timeout=300s deployment/${INSTRUMENTED_APP_NAME} --namespace ${INSTRUMENTED_APP_CONTAINER_NAMESPACE}`;

    codeSnippet = `${helmRepoSnippet}\n${installStackSnippet}\n${collectorReadinessSnippet}\n${annotateAllResourceSnippet}\n${restartDeploymentSnippet}\n${instrumentedAppReadinessSnippet}`;
  } else {
    codeSnippet = `${helmRepoSnippet}\n${installStackSnippet}`;
  }

  /**
   * Ensemble story watches for the code snippet file
   * to be created and then executes it
   */
  fs.writeFileSync(outputPath, codeSnippet);

  /**
   * The page waits for the browser window to lose
   * focus as a signal to start checking for incoming data
   */
  await page.evaluate('window.dispatchEvent(new Event("blur"))');

  /**
   * Wait for the data received indicator to appear.
   * The flow now uses DataIngestStatus which polls for data
   * after the blur event and shows "We are monitoring your cluster"
   * once both logs and metrics have arrived.
   */
  await otelKubernetesFlowPage.assertDataReceivedIndicator(15 * 60_000);

  if (!isLogsEssentialsMode) {
    const otelKubernetesOverviewDashboardPage = new OtelKubernetesOverviewDashboardPage(
      await otelKubernetesFlowPage.openClusterOverviewDashboardInNewTab()
    );

    await otelKubernetesOverviewDashboardPage.assertNodesPanelNotEmpty();

    const apmServiceName = 'opentelemetry/java/elastic';
    const apmProbePath = path.join(
      __dirname,
      '..',
      process.env.ARTIFACTS_FOLDER,
      'apm_service_probes.json'
    );
    const apmServiceCalls: Array<{
      tMs: number;
      status: number;
      requestUrl: string;
      services: Array<{ service: string; agent: string; transactionType: string }>;
      errorBody?: string;
    }> = [];

    try {
      // Open the inventory in a new tab manually so the response listener is
      // attached before navigation. page.on('response') only catches future
      // events, and the inventory's mount-fetch fires immediately on goto.
      const serviceInventoryHref = await page
        .getByTestId('observabilityOnboardingDataIngestStatusActionLink-services')
        .getAttribute('href');
      if (!serviceInventoryHref) {
        throw new Error('Service inventory URL not found');
      }

      const apmStartedAt = Date.now();
      const apmPage = await page.context().newPage();
      apmPage.on('response', async (response) => {
        // Match only the top-level list endpoint, not /internal/apm/services/foo/...
        const url = new URL(response.url());
        if (url.pathname !== '/internal/apm/services') return;
        const status = response.status();
        let services: Array<{ service: string; agent: string; transactionType: string }> = [];
        let errorBody: string | undefined;
        if (status >= 400) {
          try {
            errorBody = (await response.text()).slice(0, 1000);
          } catch {
            errorBody = '<read-failed>';
          }
        } else {
          try {
            const json = (await response.json()) as {
              items?: Array<{
                serviceName?: string;
                agentName?: string;
                transactionType?: string;
              }>;
              services?: Array<{
                serviceName?: string;
                agentName?: string;
                transactionType?: string;
              }>;
            };
            const items = json.items ?? json.services ?? [];
            services = items.map((item) => ({
              service: item?.serviceName ?? '<missing>',
              agent: item?.agentName ?? '<missing>',
              transactionType: item?.transactionType ?? '<missing>',
            }));
          } catch {
            // leave services empty
          }
        }
        apmServiceCalls.push({
          tMs: Date.now() - apmStartedAt,
          status,
          requestUrl: response.url(),
          services,
          ...(errorBody !== undefined ? { errorBody } : {}),
        });
      });
      // The CTA uses an /app/r locator redirect, which can remain stuck on the
      // "Redirecting..." page in serverless CI. Navigate to its target directly
      // so the inventory mounts before the service-row retry loop starts.
      await apmPage.goto(`${process.env.KIBANA_BASE_URL}/app/apm/services`, {
        waitUntil: 'domcontentloaded',
      });
      const apmServiceInventoryPage = new ApmServiceInventoryPage(apmPage);

      const serviceTestId = `serviceLink_${apmServiceName}`;

      await apmServiceInventoryPage.waitForServiceRow(serviceTestId);
      await apmServiceInventoryPage.page.getByTestId(serviceTestId).click();
      await apmServiceInventoryPage.assertTransactionExists();
    } finally {
      try {
        fs.writeFileSync(
          apmProbePath,
          JSON.stringify({ serviceName: apmServiceName, calls: apmServiceCalls }, null, 2)
        );
      } catch {
        // best-effort - don't mask the original test failure
      }
    }
  } else {
    await otelKubernetesFlowPage.clickExploreLogsCTA();
    await assertDiscoverHasData(page);
  }
});
