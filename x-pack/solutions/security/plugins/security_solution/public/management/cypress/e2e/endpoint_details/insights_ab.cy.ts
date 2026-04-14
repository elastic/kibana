/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createBedrockAIConnector,
  deleteConnectors,
  expectWorkflowInsightsApiToBeCalled,
  interceptGetWorkflowInsightsApiCall,
  setConnectorIdInLocalStorageAB,
  stubInferenceConnectorsApiResponse,
  stubWorkflowInsightsApiResponse,
  triggerRunningWorkflowInsights,
  fetchRunningWorkflowInsights,
  stubWorkflowInsightsPendingApiResponse,
} from '../../tasks/insights';
import { loadEndpointDetailsFlyout, workflowInsightsSelectors } from '../../screens/insights';
import { indexEndpointHosts, type CyIndexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { login } from '../../tasks/login';

const {
  insightsComponentExists,
  clickScanButton,
  insightsResultExists,
  scanButtonShouldBe,
  connectorSelectorExists,
} = workflowInsightsSelectors;

// Failing: See https://github.com/elastic/kibana/issues/262661
describe.skip(
  'Workflow Insights (AB path)',
  {
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'automaticTroubleshootingSkill',
          ])}`,
        ],
      },
    },
    tags: [
      '@ess',
      '@serverless',
      // skipped on MKI since feature flags are not supported there
      '@skipInServerlessMKI',
    ],
  },
  () => {
    let loadedEndpoint: CyIndexEndpointHosts;
    let endpointId: string;

    before(() => {
      indexEndpointHosts({ count: 1 }).then((indexedEndpoint) => {
        loadedEndpoint = indexedEndpoint;
        endpointId = indexedEndpoint.data.hosts[0].agent.id;
      });
    });

    after(() => {
      if (loadedEndpoint) {
        loadedEndpoint.cleanup();
      }
    });

    const connectorName = 'AB-TEST-CONNECTOR';

    beforeEach(() => {
      login();
      createBedrockAIConnector(connectorName).then((res) => {
        setConnectorIdInLocalStorageAB(res);
        stubInferenceConnectorsApiResponse(res.body.id, connectorName);
      });
    });

    afterEach(() => {
      deleteConnectors();
    });

    it('should render Insights section with a connector selector', () => {
      stubWorkflowInsightsPendingApiResponse([]);
      loadEndpointDetailsFlyout(endpointId);
      insightsComponentExists();
      connectorSelectorExists();
    });

    it('should trigger a scan with selected connector', () => {
      stubWorkflowInsightsPendingApiResponse([]);
      triggerRunningWorkflowInsights();
      loadEndpointDetailsFlyout(endpointId);

      connectorSelectorExists();
      scanButtonShouldBe('enabled');
      clickScanButton();

      cy.wait('@createWorkflowInsights', { timeout: 30 * 1000 });
      scanButtonShouldBe('disabled');
    });

    it('should disable Scan button while a scan is running', () => {
      fetchRunningWorkflowInsights();
      loadEndpointDetailsFlyout(endpointId);
      scanButtonShouldBe('disabled');
    });

    it('should display results after a completed scan', () => {
      stubWorkflowInsightsPendingApiResponse([]);
      interceptGetWorkflowInsightsApiCall();
      stubWorkflowInsightsApiResponse(endpointId, 1);

      loadEndpointDetailsFlyout(endpointId);

      // scan completes (pending returns empty), results fetched
      triggerRunningWorkflowInsights();
      clickScanButton();
      stubWorkflowInsightsPendingApiResponse([]);

      expectWorkflowInsightsApiToBeCalled();
      insightsResultExists();
    });
  }
);
