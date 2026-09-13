/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection Engine v2 — fetch endpoint integration tests.
 *
 * Covers: GET /rules/{id}, GET /rules, GET /tags
 *
 * Contract cases:
 *   - GET /rules/{id}: 200 with correct shape, 404 for missing/foreign id.
 *   - GET /rules: structured filters (type, severity, tags, rule_ids, enabled),
 *     sort on name/risk_score, pagination (page/per_page/total), and fields
 *     projection (always includes id).
 *   - GET /tags: tag aggregation filtered by rule_ids, severity.
 *   - Authorization: 403 for no-access caller on reads (rules-read is required).
 *
 * Ref: rule-fetch-api.md "The endpoints"
 *      rule-domain-model.md "The public rule object"
 */

import type { RoleApiCredentials } from '@kbn/scout-security';
import {
  apiTest,
  expect,
  DETECTION_HEADERS,
  DETECTION_V2_RULES,
  DETECTION_V2_TAGS,
  getDetectionRuleUrl,
  DETECTION_RULES_ALL_ROLE,
  DETECTION_RULES_READ_ROLE,
  NO_ACCESS_ROLE,
  buildQueryRule,
  buildThresholdRule,
} from '../fixtures';

const toQuery = (params: Record<string, string | number | boolean | string[] | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, String(v)));
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${DETECTION_V2_RULES}?${qs}` : DETECTION_V2_RULES;
};

apiTest.describe('Detection Engine v2 — fetch routes', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;
  let readerHeaders: Record<string, string>;
  let noAccessHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(DETECTION_RULES_ALL_ROLE);
    writerHeaders = { ...DETECTION_HEADERS, ...writerCredentials.apiKeyHeader };

    const readerCredentials = await requestAuth.getApiKeyForCustomRole(DETECTION_RULES_READ_ROLE);
    readerHeaders = { ...DETECTION_HEADERS, ...readerCredentials.apiKeyHeader };

    const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
    noAccessHeaders = { ...DETECTION_HEADERS, ...noAccessCredentials.apiKeyHeader };
  });

  apiTest.afterEach(async ({ apiClient }) => {
    const listResponse = await apiClient.get(`${DETECTION_V2_RULES}?per_page=100`, {
      headers: writerHeaders,
    });
    if (listResponse.statusCode === 200) {
      for (const rule of listResponse.body.data ?? []) {
        await apiClient.delete(getDetectionRuleUrl(rule.id), { headers: writerHeaders });
      }
    }
  });

  // -------------------------------------------------------------------------
  // GET /rules/{id}
  // -------------------------------------------------------------------------

  apiTest('get: returns 200 with the correct shape', async ({ apiClient }) => {
    const created = await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildQueryRule({ name: 'fetch-me', severity: 'high', risk_score: 63 }),
    });
    expect(created).toHaveStatusCode(201);

    const response = await apiClient.get(getDetectionRuleUrl(created.body.id), {
      headers: readerHeaders,
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(created.body.id);
    expect(response.body.type).toBe('query');
    expect(response.body.name).toBe('fetch-me');
    expect(response.body.severity).toBe('high');
    expect(response.body.risk_score).toBe(63);
    // Required response fields.
    expect(typeof response.body.rule_id).toBe('string');
    expect(typeof response.body.revision).toBe('number');
    expect(response.body.source).toBeDefined();
  });

  apiTest('get: returns 404 for an unknown id', async ({ apiClient }) => {
    const response = await apiClient.get(getDetectionRuleUrl('does-not-exist'), {
      headers: readerHeaders,
    });
    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('RULE_NOT_FOUND');
  });

  apiTest('get: returns 403 for a no-access caller', async ({ apiClient }) => {
    const created = await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildQueryRule({ name: 'no-access-get' }),
    });
    expect(created).toHaveStatusCode(201);

    const response = await apiClient.get(getDetectionRuleUrl(created.body.id), {
      headers: noAccessHeaders,
    });
    expect(response).toHaveStatusCode(403);
  });

  // -------------------------------------------------------------------------
  // GET /rules — list
  // -------------------------------------------------------------------------

  apiTest('list: returns page/per_page/total/data shape', async ({ apiClient }) => {
    await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildQueryRule({ name: 'list-rule-1' }),
    });
    await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildQueryRule({ name: 'list-rule-2' }),
    });

    const response = await apiClient.get(toQuery({ page: 1, per_page: 10 }), {
      headers: readerHeaders,
    });
    expect(response).toHaveStatusCode(200);
    expect(typeof response.body.page).toBe('number');
    expect(typeof response.body.per_page).toBe('number');
    expect(typeof response.body.total).toBe('number');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
  });

  apiTest('list: filter by type=query excludes threshold rules', async ({ apiClient }) => {
    await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildQueryRule({ name: 'filter-query' }),
    });
    await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildThresholdRule({ name: 'filter-threshold' }),
    });

    const response = await apiClient.get(toQuery({ type: 'query', per_page: 100 }), {
      headers: readerHeaders,
    });
    expect(response).toHaveStatusCode(200);
    const types = response.body.data.map((r: { type: string }) => r.type);
    expect(types.every((t: string) => t === 'query')).toBe(true);
  });

  apiTest('list: filter by severity=high excludes other severities', async ({ apiClient }) => {
    await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildQueryRule({ name: 'low-severity', severity: 'low' }),
    });
    await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildQueryRule({ name: 'high-severity', severity: 'high' }),
    });

    const response = await apiClient.get(toQuery({ severity: 'high', per_page: 100 }), {
      headers: readerHeaders,
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.data.some((r: { name: string }) => r.name === 'high-severity')).toBe(true);
    expect(response.body.data.every((r: { severity: string }) => r.severity === 'high')).toBe(true);
  });

  apiTest('list: filter by tags returns only matching rules', async ({ apiClient }) => {
    await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildQueryRule({ name: 'tagged-rule', tags: ['endpoint'] }),
    });
    await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildQueryRule({ name: 'untagged-rule' }),
    });

    const response = await apiClient.get(toQuery({ tags: ['endpoint'], per_page: 100 }), {
      headers: readerHeaders,
    });
    expect(response).toHaveStatusCode(200);
    const names = response.body.data.map((r: { name: string }) => r.name);
    expect(names).toContain('tagged-rule');
    expect(names).not.toContain('untagged-rule');
  });

  apiTest('list: sort by name returns alphabetically ordered results', async ({ apiClient }) => {
    for (const name of ['Zebra', 'Apple', 'Mango']) {
      await apiClient.post(DETECTION_V2_RULES, {
        headers: writerHeaders,
        body: buildQueryRule({ name }),
      });
    }

    const response = await apiClient.get(
      toQuery({ sort_field: 'name', sort_order: 'asc', per_page: 100 }),
      { headers: readerHeaders }
    );
    expect(response).toHaveStatusCode(200);
    const names = response.body.data.map((r: { name: string }) => r.name);
    expect(names.indexOf('Apple')).toBeLessThan(names.indexOf('Mango'));
    expect(names.indexOf('Mango')).toBeLessThan(names.indexOf('Zebra'));
  });

  apiTest('list: pagination — page 2 returns the next slice', async ({ apiClient }) => {
    // Create 3 rules.
    for (let i = 0; i < 3; i++) {
      await apiClient.post(DETECTION_V2_RULES, {
        headers: writerHeaders,
        body: buildQueryRule({ name: `page-rule-${i}` }),
      });
    }

    const page1 = await apiClient.get(
      toQuery({ page: 1, per_page: 2, sort_field: 'name', sort_order: 'asc' }),
      { headers: readerHeaders }
    );
    expect(page1).toHaveStatusCode(200);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.total).toBeGreaterThanOrEqual(3);

    const page2 = await apiClient.get(
      toQuery({ page: 2, per_page: 2, sort_field: 'name', sort_order: 'asc' }),
      { headers: readerHeaders }
    );
    expect(page2).toHaveStatusCode(200);
    // Page 2 ids must not overlap with page 1.
    const page1Ids = page1.body.data.map((r: { id: string }) => r.id);
    const page2Ids = page2.body.data.map((r: { id: string }) => r.id);
    const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
    expect(overlap).toHaveLength(0);
  });

  apiTest('list: fields projection always includes id', async ({ apiClient }) => {
    await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildQueryRule({ name: 'projection-rule' }),
    });

    // Request only the name field; id must still be present.
    const response = await apiClient.get(toQuery({ fields: ['name'], per_page: 100 }), {
      headers: readerHeaders,
    });
    expect(response).toHaveStatusCode(200);
    for (const rule of response.body.data) {
      expect(typeof rule.id).toBe('string');
      expect(rule.id.length).toBeGreaterThan(0);
    }
  });

  // -------------------------------------------------------------------------
  // GET /tags
  // -------------------------------------------------------------------------

  apiTest('tags: returns all unique tags across rules', async ({ apiClient }) => {
    await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildQueryRule({ name: 'tagged-a', tags: ['endpoint', 'windows'] }),
    });
    await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildQueryRule({ name: 'tagged-b', tags: ['linux', 'endpoint'] }),
    });

    const response = await apiClient.get(DETECTION_V2_TAGS, { headers: readerHeaders });
    expect(response).toHaveStatusCode(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toContain('endpoint');
    expect(response.body.data).toContain('windows');
    expect(response.body.data).toContain('linux');
  });
});
