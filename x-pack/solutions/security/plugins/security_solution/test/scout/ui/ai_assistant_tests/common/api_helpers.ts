/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ── Connector payloads ──────────────────────────────────────────────────────

export const azureConnectorPayload = {
  connector_type_id: '.gen-ai',
  secrets: { apiKey: '123' },
  config: {
    apiUrl:
      'https://goodurl.com/openai/deployments/good-gpt4o/chat/completions?api-version=2024-02-15-preview',
    apiProvider: 'Azure OpenAI',
  },
  name: 'Azure OpenAI scout test connector',
};

export const bedrockConnectorPayload = {
  connector_type_id: '.bedrock',
  secrets: { accessKey: '123', secret: '123' },
  config: { apiUrl: 'https://bedrock.com' },
  name: 'Bedrock scout test connector',
};

// ── Connector CRUD ──────────────────────────────────────────────────────────

export async function createConnector(
  kbnClient: any,
  payload: typeof azureConnectorPayload | typeof bedrockConnectorPayload
): Promise<{ id: string }> {
  const resp = await kbnClient.request({
    method: 'POST',
    path: '/api/actions/connector',
    body: payload,
  });
  return resp.data;
}

export async function createAzureConnector(kbnClient: any): Promise<{ id: string }> {
  return createConnector(kbnClient, azureConnectorPayload);
}

export async function createBedrockConnector(kbnClient: any): Promise<{ id: string }> {
  return createConnector(kbnClient, bedrockConnectorPayload);
}

export async function deleteConnectors(kbnClient: any): Promise<void> {
  try {
    const resp = await kbnClient.request({
      method: 'GET',
      path: '/api/actions/connectors',
    });
    const connectors: Array<{ id: string }> = resp.data ?? [];
    for (const connector of connectors) {
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/actions/connector/${connector.id}`,
      });
    }
  } catch {
    // Ignore - connectors may not exist
  }
}

// ── Conversation mock factory ───────────────────────────────────────────────

export function getMockConversation(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    title: 'Test Conversation',
    apiConfig: {
      actionTypeId: '.gen-ai',
      connectorId: '',
      defaultSystemPromptId: 'default-system-prompt',
      model: 'test-model',
      provider: 'OpenAI',
    },
    excludeFromLastConversationStorage: false,
    isDefault: false,
    messages: [],
    replacements: {},
    category: 'assistant',
    ...overrides,
  };
}

// ── Conversation CRUD ───────────────────────────────────────────────────────

export async function createConversation(
  kbnClient: any,
  overrides?: Record<string, unknown>
): Promise<any> {
  const body = getMockConversation(overrides);
  const resp = await kbnClient.request({
    method: 'POST',
    path: '/api/security_ai_assistant/current_user/conversations',
    body,
  });
  return resp.data;
}

export async function deleteConversations(esClient: any): Promise<void> {
  try {
    await esClient.deleteByQuery({
      index: '.kibana-elastic-ai-assistant-conversations-*',
      query: { match_all: {} },
      refresh: true,
      conflicts: 'proceed',
    });
  } catch {
    // Ignore - index may not exist
  }
}

// ── Prompt mock factory ─────────────────────────────────────────────────────

export function getMockCreatePrompt(
  overrides?: Record<string, unknown>
): Record<string, unknown> {
  return {
    name: 'Mock Prompt Name',
    promptType: 'quick',
    content: 'Mock Prompt Content',
    consumer: 'securitySolutionUI',
    ...overrides,
  };
}

// ── Prompt CRUD ─────────────────────────────────────────────────────────────

export async function createPromptsBulk(
  kbnClient: any,
  prompts: Array<Record<string, unknown>>
): Promise<void> {
  const body = {
    create: prompts.map((p) => getMockCreatePrompt(p)),
  };
  await kbnClient.request({
    method: 'POST',
    path: '/api/security_ai_assistant/prompts/_bulk_action',
    body,
  });
}

export async function deletePrompts(esClient: any): Promise<void> {
  try {
    await esClient.deleteByQuery({
      index: '.kibana-elastic-ai-assistant-prompts-*',
      query: { match_all: {} },
      refresh: true,
      conflicts: 'proceed',
    });
  } catch {
    // Ignore - index may not exist
  }
}

// ── Alerts & Rules ──────────────────────────────────────────────────────────

export async function deleteAlertsAndRules(kbnClient: any): Promise<void> {
  try {
    const rulesResp = await kbnClient.request({
      method: 'GET',
      path: '/api/detection_engine/rules/_find',
      query: { per_page: 100 },
    });
    const rules: Array<{ id: string }> = rulesResp.data?.data ?? [];
    for (const rule of rules) {
      await kbnClient.request({
        method: 'DELETE',
        path: '/api/detection_engine/rules',
        query: { id: rule.id },
      });
    }
  } catch {
    // Ignore
  }
}

export async function createRule(
  kbnClient: any,
  rule: Record<string, unknown>
): Promise<{ id: string; name: string }> {
  const resp = await kbnClient.request({
    method: 'POST',
    path: '/api/detection_engine/rules',
    body: rule,
  });
  return resp.data;
}

// ── License ─────────────────────────────────────────────────────────────────

export async function startBasicLicense(kbnClient: any): Promise<void> {
  await kbnClient.request({
    method: 'POST',
    path: '/_license/start_basic?acknowledge=true',
  });
}
