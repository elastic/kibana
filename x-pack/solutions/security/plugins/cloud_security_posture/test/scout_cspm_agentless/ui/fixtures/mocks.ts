/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateAgentlessPolicyRequest } from '@kbn/fleet-plugin/common/types/rest_spec/agentless_policy';
import type { ScoutPage } from '@kbn/scout-security';

// Use the Fleet plugin's typed request body
type AgentlessPolicyRequestBody = CreateAgentlessPolicyRequest['body'];

export async function mockPackagePoliciesEmpty(page: ScoutPage) {
  await page.route(/\/api\/fleet\/package_policies/, async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, perPage: 1000 }),
      });
    } else {
      await route.continue();
    }
  });
}

export async function mockAgentPoliciesCreate(page: ScoutPage) {
  await page.route(/\/api\/fleet\/agent_policies/, async (route, request) => {
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          item: { id: `mock-agent-${Date.now()}`, name: body.name, namespace: body.namespace },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

export async function mockPackagePoliciesEmptyWithCapture(
  page: ScoutPage,
  onPostCapture: (body: Record<string, unknown>) => any
) {
  await page.route(/\/api\/fleet\/package_policies/, async (route, request) => {
    if (request.method() === 'GET') {
      // Mock empty list for form initialization
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          total: 0,
          page: 1,
          perPage: 1000,
        }),
      });
    } else if (request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      const responseBody = onPostCapture(body);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseBody),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Creates a mock agentless policy response for testing.
 * The response format should match what the UI expects after successful creation.
 */
export function createMockAgentlessPolicyResponse(
  requestBody: AgentlessPolicyRequestBody,
  connectorId?: string
) {
  const mockPolicyId = `mock-policy-${Date.now()}`;
  const mockAgentPolicyId = `mock-agent-policy-${Date.now()}`;
  const mockConnectorId = connectorId || `mock-connector-${Date.now()}`;

  // Convert legacy inputs format to array format for the response
  const inputsArray = Object.entries(requestBody.inputs ?? {}).map(([type, input]) => ({
    type,
    enabled: input.enabled,
    streams: Object.entries(input.streams ?? {}).map(([streamKey, stream]) => ({
      enabled: stream.enabled,
      data_stream: { type: 'logs', dataset: streamKey },
      vars: stream.vars,
    })),
  }));

  return {
    item: {
      id: mockPolicyId,
      name: requestBody.name,
      namespace: requestBody.namespace || 'default',
      package: requestBody.package,
      inputs: inputsArray,
      policy_id: mockAgentPolicyId,
      policy_ids: [mockAgentPolicyId],
      supports_agentless: true,
      supports_cloud_connector: !!requestBody.cloud_connector?.enabled,
      cloud_connector_id: requestBody.cloud_connector?.enabled ? mockConnectorId : undefined,
    },
  };
}

/**
 * Mocks the agentless policies API route, capturing POST requests and returning mock responses.
 */
export async function mockAgentlessPoliciesWithCapture(
  page: ScoutPage,
  onPostCapture: (body: AgentlessPolicyRequestBody) => void,
  connectorId?: string
) {
  await page.route(/\/api\/fleet\/agentless_policies/, async (route, request) => {
    if (request.method() === 'POST') {
      const capturedRequestBody = request.postDataJSON() as AgentlessPolicyRequestBody;
      onPostCapture(capturedRequestBody);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockAgentlessPolicyResponse(capturedRequestBody, connectorId)),
      });
    } else {
      await route.continue();
    }
  });
}
