/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  AllConnectorsResponse,
  ConnectorResponse,
} from '@kbn/actions-plugin/common/routes/connector/response';
import { DEFEND_INSIGHTS } from '@kbn/elastic-assistant-common';
import { request } from './common';
import { ActionType } from '../../../../common/endpoint/types/workflow_insights';
import {
  WORKFLOW_INSIGHTS_ROUTE,
  WORKFLOW_INSIGHTS_UPDATE_ROUTE,
} from '../../../../common/endpoint/constants';

const INTERNAL_CLOUD_CONNECTORS = ['Elastic-Cloud-SMTP'];

export const createBedrockAIConnector = (connectorName?: string) =>
  request<ConnectorResponse>({
    method: 'POST',
    url: '/api/actions/connector',
    body: {
      connector_type_id: '.bedrock',
      secrets: {
        accessKey: '123',
        secret: '123',
      },
      config: {
        apiUrl: 'https://bedrock.com',
      },
      name: connectorName || 'Bedrock cypress test e2e connector',
    },
  });

export const getConnectors = () =>
  request<AllConnectorsResponse[]>({
    method: 'GET',
    url: 'api/actions/connectors',
  });

export const deleteConnectors = () => {
  getConnectors().then(($response) => {
    if ($response.body.length > 0) {
      const ids = $response.body.map((connector) => {
        return connector.id;
      });
      ids.forEach((id) => {
        if (!INTERNAL_CLOUD_CONNECTORS.includes(id)) {
          request({
            method: 'DELETE',
            url: `api/actions/connector/${id}`,
          });
        }
      });
    }
  });
};

export const setConnectorIdInLocalStorage = (res: { body: { id: string } }) => {
  window.localStorage.setItem(
    `elasticAssistantDefault.defendInsights.default.connectorId`,
    `"${res.body.id}"`
  );
};

export const validateUserGotRedirectedToTrustedApps = () => {
  cy.url().should('include', '/app/security/administration/trusted_apps');
};

export const validateUserGotRedirectedToEndpointDetails = (endpointId: string) => {
  cy.url().should(
    'include',
    `/app/security/administration/endpoints?selected_endpoint=${endpointId}&show=details`
  );
};

export const interceptGetWorkflowInsightsApiCall = () => {
  cy.intercept({ method: 'GET', url: '**/internal/api/endpoint/workflow_insights**' }).as(
    'getWorkflowInsights'
  );
};

export const expectWorkflowInsightsApiToBeCalled = () => {
  cy.wait('@getWorkflowInsights', { timeout: 30 * 1000 });
};

export const interceptGetDefendInsightsApiCall = () => {
  cy.intercept({ method: 'GET', url: '**/internal/elastic_assistant/defend_insights**' }).as(
    'getDefendInsights'
  );
};

export const expectDefendInsightsApiToBeCalled = () => {
  cy.wait('@getDefendInsights', { timeout: 30 * 1000 });
};

export const interceptPostDefendInsightsApiCall = () => {
  cy.intercept({ method: 'POST', url: '**/internal/elastic_assistant/defend_insights**' }).as(
    'createInsights'
  );
};

export const expectPostDefendInsightsApiToBeCalled = () => {
  cy.wait('@createInsights', { timeout: 30 * 1000 });
};

export const stubPutWorkflowInsightsApiResponse = () => {
  cy.intercept('PUT', '**/internal/api/endpoint/workflow_insights/**', (req) => {
    req.continue((res) => {
      return res.send(200, {
        status: 'ok',
      });
    });
  });
};

export const stubDefendInsightsApiResponse = (
  overrides: Record<string, string> = {},
  config: { times?: number } = {}
) => {
  cy.intercept(
    {
      method: 'GET',
      url: '**/internal/elastic_assistant/defend_insights?status=running**',
      ...(config.times ? { times: config.times } : {}),
    },
    (req) => {
      req.continue((res) => {
        return res.send(200, {
          data: [
            {
              timestamp: '2024-12-16T13:44:52.633Z',
              id: 'd95561cb-1f75-4a6c-8be4-cb7529ddd5e0',
              backingIndex:
                '.ds-.kibana-elastic-ai-assistant-defend-insights-default-2024.12.16-000001',
              createdAt: '2024-12-16T13:44:52.633Z',
              updatedAt: '2024-12-16T13:44:52.633Z',
              lastViewedAt: '2024-12-16T13:44:53.866Z',
              users: [
                {
                  id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
                  name: 'elastic',
                },
              ],
              namespace: 'default',
              status: 'running',
              apiConfig: {
                connectorId: 'db760d65-6722-4646-955f-fbdc9851df86',
                actionTypeId: '.bedrock',
              },
              endpointIds: ['33581c4f-bef1-4162-9809-4c208e2e1991'],
              insightType: 'incompatible_antivirus',
              insights: [],
              generationIntervals: [],
              averageIntervalMs: 0,
              ...overrides,
            },
          ],
        });
      });
    }
  );
};

export const stubWorkflowInsightsApiResponse = (endpointId: string) => {
  cy.intercept('GET', '**/internal/api/endpoint/workflow_insights**', (req) => {
    req.continue((res) => {
      return res.send(200, [
        {
          remediation: {
            exception_list_items: [
              {
                entries: [
                  {
                    field: 'process.executable.caseless',
                    type: 'match',
                    value: '/usr/bin/clamscan',
                    operator: 'included',
                  },
                ],
                list_id: 'endpoint_trusted_apps',
                name: 'ClamAV',
                os_types: ['linux'],
                description: 'Suggested by Security Workflow Insights',
                tags: ['policy:all'],
              },
            ],
          },
          metadata: {
            notes: {
              llm_model: '',
            },
          },
          '@timestamp': '2024-12-16T13:45:03.055Z',
          action: {
            type: 'refreshed',
            timestamp: '2024-12-16T13:45:03.055Z',
          },
          source: {
            data_range_end: '2024-12-17T13:45:03.055Z',
            id: 'db760d65-6722-4646-955f-fbdc9851df86',
            type: 'llm-connector',
            data_range_start: '2024-12-16T13:45:03.055Z',
          },
          message: 'Incompatible antiviruses detected',
          category: 'endpoint',
          type: 'incompatible_antivirus',
          value: 'ClamAV',
          target: {
            ids: [endpointId],
            type: 'endpoint',
          },
          id: 'CMm3z5MBPx3JiizjFx5g',
        },
      ]);
    });
  });
};

export const triggerRunningDefendInsights = () => {
  return request({
    method: 'POST',
    url: DEFEND_INSIGHTS,
    body: JSON.stringify({
      endpointIds: ['test'],
      insightType: 'incompatible_antivirus',
      anonymizationFields: [],
      replacements: {},
      subAction: 'invokeAI',
      apiConfig: {
        connectorId: 'test',
        actionTypeId: 'test',
      },
    }),
    headers: { 'Elastic-Api-Version': '1' },
    failOnStatusCode: false,
  });
};

export const fetchRunningDefendInsights = () => {
  return request({
    method: 'GET',
    url: DEFEND_INSIGHTS,
    qs: {
      status: 'running',
      endpoint_ids: 'test',
    },
    headers: { 'Elastic-Api-Version': '1' },
    failOnStatusCode: false,
  });
};

export const fetchWorkflowInsights = (overrides?: Record<string, unknown>) => {
  return request({
    method: 'GET',
    url: WORKFLOW_INSIGHTS_ROUTE,
    qs: {
      actionTypes: JSON.stringify([ActionType.Refreshed]),
      targetIds: JSON.stringify(['test']),
    },
    headers: { 'Elastic-Api-Version': '1' },
    ...(overrides ?? {}),
  });
};

export const updateWorkflowInsights = () => {
  return request({
    method: 'PUT',
    url: WORKFLOW_INSIGHTS_UPDATE_ROUTE.replace('{insightId}', 'test'),
    body: JSON.stringify({
      action: {
        type: ActionType.Remediated,
      },
    }),
    headers: { 'Elastic-Api-Version': '1' },
    failOnStatusCode: false,
  });
};
