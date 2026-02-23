/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import type { ApiServicesFixture, EsClient } from '@kbn/scout';
import type { CustomQueryRule } from '@kbn/scout-security/src/playwright/constants/detection_rules';
import {
  CUSTOM_QUERY_RULE,
  DEFAULT_SECURITY_SOLUTION_INDEXES,
} from '@kbn/scout-security/src/playwright/constants/detection_rules';
import type { SecurityApiServicesFixture } from '@kbn/scout-security';

/**
 * Create a detection rule via API.
 */
export async function createRule(
  apiServices: SecurityApiServicesFixture,
  overrides: Partial<CustomQueryRule> & Record<string, unknown> = {}
): Promise<void> {
  const timestamp = Date.now();
  const rule: CustomQueryRule = {
    ...CUSTOM_QUERY_RULE,
    index: DEFAULT_SECURITY_SOLUTION_INDEXES,
    name: `New Rule Test ${timestamp}`,
    rule_id: `rule-${timestamp}`,
    ...overrides,
  };
  await apiServices.detectionRule.createCustomQueryRule(rule);
}

/**
 * Delete all detection rules and alerts.
 */
export async function deleteAlertsAndRules(apiServices: SecurityApiServicesFixture): Promise<void> {
  try {
    await apiServices.detectionRule.deleteAll();
    await apiServices.detectionAlerts.deleteAll();
  } catch {
    // Cleanup best-effort; ignore errors
  }
}

/**
 * Create a saved query via API.
 */
export async function createSavedQuery(
  kbnClient: KbnClient,
  params: { title: string; query: string; filters?: unknown[] }
): Promise<{ id: string }> {
  const response = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/saved_query',
    body: {
      title: params.title,
      description: '',
      query: { query: params.query, language: 'kuery' },
      filters: params.filters ?? [],
    },
  });
  return response.data;
}

/**
 * Delete all saved queries.
 */
export async function deleteSavedQueries(kbnClient: KbnClient): Promise<void> {
  try {
    const response = await kbnClient.request<{ savedQueries: Array<{ id: string }> }>({
      method: 'GET',
      path: '/api/saved_query/_find',
    });
    for (const sq of response.data?.savedQueries ?? []) {
      await kbnClient.request({ method: 'DELETE', path: `/api/saved_query/${sq.id}` });
    }
  } catch {
    /* cleanup best-effort */
  }
}

/**
 * Create a case via API.
 */
export async function createCase(
  kbnClient: KbnClient,
  params: { title: string; description?: string; tags?: string[] }
): Promise<{ id: string }> {
  const response = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/cases',
    body: {
      title: params.title,
      description: params.description ?? 'Test case',
      tags: params.tags ?? [],
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      settings: { syncAlerts: true },
      owner: 'securitySolution',
    },
    headers: {
      'kbn-xsrf': 'scout',
      'elastic-api-version': '2023-10-31',
    },
  });
  return response.data;
}

/**
 * Delete all cases.
 */
export async function deleteCases(kbnClient: KbnClient): Promise<void> {
  try {
    const response = await kbnClient.request<{ cases: Array<{ id: string }> }>({
      method: 'GET',
      path: '/api/cases/_find',
      headers: { 'elastic-api-version': '2023-10-31' },
    });
    const ids = response.data?.cases?.map((c) => c.id) ?? [];
    if (ids.length > 0) {
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/cases?ids=${ids.map(encodeURIComponent).join('&ids=')}`,
        headers: { 'elastic-api-version': '2023-10-31' },
      });
    }
  } catch {
    /* cleanup best-effort */
  }
}

/**
 * Switch to basic license (for basic-license tests).
 */
export async function startBasicLicense(kbnClient: KbnClient): Promise<void> {
  await kbnClient.request({
    method: 'POST',
    path: '/api/licensing/start_basic',
    query: { acknowledge: 'true' },
  });
}

/**
 * Trigger a manual rule run (backfill).
 */
export async function manualRuleRun(
  kbnClient: KbnClient,
  ruleId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  await kbnClient.request({
    method: 'POST',
    path: '/internal/detection_engine/rules/_schedule',
    body: [{ rule_id: ruleId, start_date: startDate, end_date: endDate }],
    headers: { 'x-elastic-internal-origin': 'security-solution' },
  });
}

/**
 * Install prebuilt rules (mock or real).
 */
export async function installPrebuiltRules(kbnClient: KbnClient): Promise<void> {
  await kbnClient.request({
    method: 'PUT',
    path: '/api/detection_engine/rules/prepackaged',
  });
}

/**
 * Create mock prebuilt rule assets for testing.
 */
export async function bulkCreateRuleAssets(
  kbnClient: KbnClient,
  rules: Array<Record<string, unknown>>
): Promise<void> {
  await kbnClient.request({
    method: 'POST',
    path: '/api/detection_engine/rules/prepackaged/_bulk_create',
    body: rules,
    headers: { 'x-elastic-internal-origin': 'security-solution' },
  });
}

/**
 * Set a Kibana advanced setting.
 */
export async function setKibanaSetting(
  kbnClient: KbnClient,
  key: string,
  value: unknown
): Promise<void> {
  await kbnClient.request({
    method: 'POST',
    path: '/api/kibana/settings',
    body: { changes: { [key]: value } },
  });
}

/**
 * Create a connector via API.
 */
export async function createConnector(
  kbnClient: KbnClient,
  params: {
    name: string;
    connector_type_id: string;
    config?: Record<string, unknown>;
    secrets?: Record<string, unknown>;
  }
): Promise<{ id: string }> {
  const response = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/actions/connector',
    body: {
      name: params.name,
      connector_type_id: params.connector_type_id,
      config: params.config ?? {},
      secrets: params.secrets ?? {},
    },
  });
  return response.data;
}

/**
 * Delete all connectors.
 */
export async function deleteConnectors(kbnClient: KbnClient): Promise<void> {
  try {
    const response = await kbnClient.request<Array<{ id: string }>>({
      method: 'GET',
      path: '/api/actions/connectors',
    });
    for (const connector of response.data ?? []) {
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/actions/connector/${connector.id}`,
      });
    }
  } catch {
    /* cleanup best-effort */
  }
}

/**
 * Delete the gap auto-fill scheduler.
 */
export async function deleteGapAutoFillScheduler(kbnClient: KbnClient): Promise<void> {
  try {
    await kbnClient.request({
      method: 'DELETE',
      path: '/internal/detection_engine/rules/gap_auto_fill_scheduler',
      headers: { 'x-elastic-internal-origin': 'security-solution' },
    });
  } catch {
    /* cleanup best-effort */
  }
}

/**
 * Delete all cases via the cases API service.
 */
export async function deleteAllCases(casesApi: ApiServicesFixture['cases']): Promise<void> {
  try {
    const findResult = await casesApi.find();
    const ids = findResult.data?.map((c) => c.id) ?? [];
    if (ids.length > 0) {
      await casesApi.delete(ids);
    }
  } catch {
    /* cleanup best-effort */
  }
}

/**
 * Enable the Asset Inventory via Kibana advanced setting.
 */
export async function enableAssetInventory(kbnClient: KbnClient): Promise<void> {
  await setKibanaSetting(kbnClient, 'securitySolution:enableAssetInventory', true);
}

/**
 * Disable the Asset Inventory via Kibana advanced setting.
 */
export async function disableAssetInventory(kbnClient: KbnClient): Promise<void> {
  await setKibanaSetting(kbnClient, 'securitySolution:enableAssetInventory', false);
}

/**
 * Enable the Asset Inventory via API call.
 */
export async function enableAssetInventoryApiCall(kbnClient: KbnClient): Promise<void> {
  await kbnClient
    .request({
      method: 'POST',
      path: '/internal/asset_inventory/enable',
      headers: { 'x-elastic-internal-origin': 'security-solution' },
    })
    .catch(() => {});
}

/**
 * Create a data view via API.
 */
export async function postDataView(
  kbnClient: KbnClient,
  title: string,
  name?: string,
  id?: string
): Promise<void> {
  await kbnClient
    .request({
      method: 'POST',
      path: '/api/data_views/data_view',
      body: { data_view: { title, name: name ?? title, id } },
    })
    .catch(() => {});
}

/**
 * Create an asset inventory index mapping.
 */
export async function createAssetInventoryMapping(
  esClient: EsClient,
  indexName: string
): Promise<void> {
  try {
    await esClient.indices.putMapping({
      index: indexName,
      properties: {
        'asset.id': { type: 'keyword' },
        'asset.name': { type: 'keyword' },
        'asset.type': { type: 'keyword' },
      },
    });
  } catch {
    // best-effort
  }
}

/**
 * Create a mock asset document for testing.
 */
export async function createMockAsset(
  esClient: EsClient,
  indexName: string,
  asset: Record<string, unknown> = {}
): Promise<void> {
  try {
    await esClient.index({
      index: indexName,
      refresh: 'wait_for',
      document: {
        'asset.id': 'mock-asset-1',
        'asset.name': 'Mock Asset',
        'asset.type': 'host',
        ...asset,
      },
    });
  } catch {
    // best-effort
  }
}
