/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { ApiClientFixture } from '@kbn/scout-oblt';
import { apiTest, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { Aggregators } from '../../../../common/custom_threshold_rule/types';
import { getAdminHeaders, type RuleResponse } from '../fixtures/helpers';

/**
 * Ported from FTR
 * `x-pack/solutions/observability/test/alerting_api_integration/observability/custom_threshold_rule_data_view.ts`.
 *
 * Runs against stateful classic only (matching the original trial-license FTR
 * config). The endpoints under test are driven through `apiClient` with an admin
 * API key; `esClient` is used to assert the persisted saved-object references.
 * These tests verify references and parameter persistence, not RBAC.
 */

const DATA_VIEW_ID = 'data-view-id';

const buildCriteria = () => [
  {
    comparator: COMPARATORS.GREATER_THAN,
    threshold: [7500000],
    timeSize: 5,
    timeUnit: 'm',
    metrics: [{ name: 'A', field: 'span.self_time.sum.us', aggType: Aggregators.AVERAGE }],
  },
];

const createCustomThresholdRule = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  { name, params }: { name: string; params: Record<string, unknown> }
): Promise<RuleResponse> => {
  const res = await apiClient.post('api/alerting/rule', {
    headers,
    responseType: 'json',
    body: {
      name,
      rule_type_id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
      consumer: 'logs',
      tags: ['observability'],
      schedule: { interval: '1m' },
      actions: [],
      params,
    },
  });
  expect(res).toHaveStatusCode(200);
  return res.body as RuleResponse;
};

const createDataView = (apiClient: ApiClientFixture, headers: Record<string, string>) =>
  apiClient.post('api/content_management/rpc/create', {
    headers,
    responseType: 'json',
    body: {
      contentTypeId: 'index-pattern',
      data: {
        fieldAttrs: '{}',
        title: 'random-index*',
        timeFieldName: '@timestamp',
        sourceFilters: '[]',
        fields: '[]',
        fieldFormatMap: '{}',
        typeMeta: '{}',
        runtimeFieldMap: '{}',
        name: 'test-data-view',
      },
      options: { id: DATA_VIEW_ID },
      version: 1,
    },
  });

const deleteDataView = (apiClient: ApiClientFixture, headers: Record<string, string>) =>
  apiClient.post('api/content_management/rpc/delete', {
    headers,
    responseType: 'json',
    body: {
      contentTypeId: 'index-pattern',
      id: DATA_VIEW_ID,
      options: { force: true },
      version: 1,
    },
  });

interface RuleSoHit {
  _source?: { references?: unknown; alert?: { params?: { searchConfiguration?: unknown } } };
  fields?: unknown;
}

const searchRuleSo = async (esClient: Client, ruleId: string): Promise<RuleSoHit[]> => {
  // Saved objects are written with `refresh: false`, so refresh before reading
  // to avoid a read-after-write race (the FTR helper did this via the client).
  await esClient.indices.refresh({ index: '.kibana*', ignore_unavailable: true });
  const resp = await esClient.search({
    index: '.kibana*',
    query: { bool: { filter: [{ term: { _id: `alert:${ruleId}` } }] } },
    fields: ['alert.params', 'references'],
  });
  return resp.hits.hits as RuleSoHit[];
};

apiTest.describe('Custom Threshold rule data view', { tag: [...tags.stateful.classic] }, () => {
  let headers: Record<string, string>;
  let ruleId: string;
  // Rules created by the `noDataBehavior` cases; removed after each such test.
  let transientRuleIds: string[] = [];

  apiTest.beforeAll(async ({ apiClient, requestAuth }) => {
    headers = await getAdminHeaders(requestAuth);
    await createDataView(apiClient, headers);

    // Create the shared rule up front so the tests below don't depend on each
    // other's execution order for `ruleId`.
    const rule = await createCustomThresholdRule(apiClient, headers, {
      name: 'Threshold rule',
      params: {
        criteria: buildCriteria(),
        alertOnNoData: true,
        alertOnGroupDisappear: true,
        searchConfiguration: {
          query: { query: '', language: 'kuery' },
          index: DATA_VIEW_ID,
        },
      },
    });
    ruleId = rule.id;
  });

  apiTest.afterEach(async ({ apiClient }) => {
    for (const id of transientRuleIds) {
      await apiClient.delete(`api/alerting/rule/${id}`, { headers });
    }
    transientRuleIds = [];
  });

  apiTest.afterAll(async ({ apiClient }) => {
    if (ruleId) {
      await apiClient.delete(`api/alerting/rule/${ruleId}`, { headers });
    }
    await deleteDataView(apiClient, headers);
  });

  apiTest('create a threshold rule', async ({ apiClient }) => {
    // The shared rule is created in `beforeAll`; verify it persisted and is
    // readable so the dependent tests below can rely on it.
    const res = await apiClient.get(`api/alerting/rule/${ruleId}`, {
      headers,
      responseType: 'json',
    });
    expect(res).toHaveStatusCode(200);
    expect((res.body as RuleResponse).id).toBe(ruleId);
  });

  apiTest(
    'should have correct data view reference before and after edit',
    async ({ apiClient, esClient }) => {
      const alertHitsV1 = await searchRuleSo(esClient, ruleId);

      const bulkEditRes = await apiClient.post('internal/alerting/rules/_bulk_edit', {
        headers,
        responseType: 'json',
        body: { ids: [ruleId], operations: [{ operation: 'set', field: 'apiKey' }] },
      });
      expect(bulkEditRes).toHaveStatusCode(200);

      const alertHitsV2 = await searchRuleSo(esClient, ruleId);

      expect(alertHitsV1[0]?._source?.references).toStrictEqual([
        {
          name: 'param:kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: DATA_VIEW_ID,
        },
      ]);
      expect(alertHitsV1[0]?._source?.alert?.params?.searchConfiguration).toStrictEqual({
        query: { query: '', language: 'kuery' },
        indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
      });
      expect(alertHitsV1[0]?.fields).toStrictEqual(alertHitsV2[0]?.fields);
      expect(alertHitsV1[0]?._source?.references ?? true).toStrictEqual(
        alertHitsV2[0]?._source?.references ?? false
      );
    }
  );

  apiTest('should create rule with noDataBehavior: recover', async ({ apiClient }) => {
    const rule = await createCustomThresholdRule(apiClient, headers, {
      name: 'Custom threshold rule with noDataBehavior recover',
      params: {
        criteria: buildCriteria(),
        alertOnNoData: false,
        noDataBehavior: 'recover',
        searchConfiguration: { query: { query: '', language: 'kuery' }, index: DATA_VIEW_ID },
      },
    });
    transientRuleIds.push(rule.id);
    expect(rule.params.noDataBehavior).toBe('recover');
  });

  apiTest('should create rule with noDataBehavior: alertOnNoData', async ({ apiClient }) => {
    const rule = await createCustomThresholdRule(apiClient, headers, {
      name: 'Custom threshold rule with noDataBehavior alertOnNoData',
      params: {
        criteria: buildCriteria(),
        alertOnNoData: true,
        noDataBehavior: 'alertOnNoData',
        searchConfiguration: { query: { query: '', language: 'kuery' }, index: DATA_VIEW_ID },
      },
    });
    transientRuleIds.push(rule.id);
    expect(rule.params.noDataBehavior).toBe('alertOnNoData');
  });

  apiTest('should create rule with noDataBehavior: remainActive', async ({ apiClient }) => {
    const rule = await createCustomThresholdRule(apiClient, headers, {
      name: 'Custom threshold rule with noDataBehavior remainActive',
      params: {
        criteria: buildCriteria(),
        alertOnNoData: false,
        noDataBehavior: 'remainActive',
        searchConfiguration: { query: { query: '', language: 'kuery' }, index: DATA_VIEW_ID },
      },
    });
    transientRuleIds.push(rule.id);
    expect(rule.params.noDataBehavior).toBe('remainActive');
  });

  apiTest('should update existing rule to add noDataBehavior parameter', async ({ apiClient }) => {
    const rule = await createCustomThresholdRule(apiClient, headers, {
      name: 'Custom threshold rule without noDataBehavior',
      params: {
        criteria: buildCriteria(),
        alertOnNoData: true,
        alertOnGroupDisappear: true,
        searchConfiguration: { query: { query: '', language: 'kuery' }, index: DATA_VIEW_ID },
      },
    });
    transientRuleIds.push(rule.id);
    expect(rule.params.noDataBehavior).toBeUndefined();

    const updateRes = await apiClient.put(`api/alerting/rule/${rule.id}`, {
      headers,
      responseType: 'json',
      body: {
        name: 'Custom threshold rule with noDataBehavior',
        schedule: { interval: '1m' },
        tags: ['observability'],
        actions: [],
        params: {
          criteria: buildCriteria(),
          alertOnNoData: false,
          noDataBehavior: 'remainActive',
          searchConfiguration: { query: { query: '', language: 'kuery' }, index: DATA_VIEW_ID },
        },
      },
    });
    expect(updateRes).toHaveStatusCode(200);
    expect((updateRes.body as RuleResponse).params.noDataBehavior).toBe('remainActive');
  });
});
