/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../common/constants';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
} from '../../fixtures/maintainers/constants';
import {
  clearEntityStoreIndices,
  seedHostEntity,
  triggerMaintainerRun,
  waitForEntityStoreRunning,
} from '../../fixtures/maintainers/helpers';

const ALERTS_INDEX = '.alerts-security.alerts-default';
const SOURCE_INDEX = 'risk-inputs-ranking-source';
const RISK_SCORE_INDEX = 'risk-score.risk-score-default';
const HOST_NAME = 'risk-inputs-ranking-host';
const HOST_ID = `host:${HOST_NAME}`;
// Compared as text, these sort as 9, 21, 100: the reverse of their numeric order.
const RULE_RISK_SCORES = [100, 21, 9];
const RULE_NAMES = RULE_RISK_SCORES.map((riskScore) => `Risk inputs ranking rule ${riskScore}`);
// Rule execution, alert polling and a synchronous maintainer run don't fit the 60s default.
const TEST_TIMEOUT_MS = 180_000;

interface RiskInput {
  risk_score: number;
  contribution_score: number;
}

const waitForAlerts = async (esClient: EsClient, ruleNames: string[], timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await esClient.indices.refresh({ index: ALERTS_INDEX, ignore_unavailable: true });
    const { count } = await esClient.count({
      index: ALERTS_INDEX,
      ignore_unavailable: true,
      query: { terms: { 'kibana.alert.rule.name': ruleNames } },
    });
    if (count >= ruleNames.length) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for one alert from each of: ${ruleNames.join(', ')}`);
};

apiTest.describe('Risk score maintainer risk inputs', { tag: ENTITY_STORE_TAGS }, () => {
  apiTest.setTimeout(TEST_TIMEOUT_MS);

  let defaultHeaders: Record<string, string>;
  let internalHeaders: Record<string, string>;
  const createdRuleIds: string[] = [];

  apiTest.beforeAll(async ({ apiClient, esClient, samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
    internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

    await apiClient
      .post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      })
      .catch(() => {});
    await clearEntityStoreIndices(esClient);

    const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect([200, 201]).toContain(installResponse.statusCode);
    await waitForEntityStoreRunning(apiClient, defaultHeaders);

    const initResponse = await apiClient.post(
      ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_INIT,
      { headers: internalHeaders, responseType: 'json', body: {} }
    );
    expect([200, 201]).toContain(initResponse.statusCode);

    await esClient.indices.delete({ index: SOURCE_INDEX, ignore_unavailable: true });
    await esClient.indices.create({
      index: SOURCE_INDEX,
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          host: { properties: { name: { type: 'keyword' } } },
        },
      },
    });
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    for (const id of createdRuleIds) {
      await apiClient.delete(`${DETECTION_ENGINE_RULES_URL}?id=${id}`, {
        headers: defaultHeaders,
        responseType: 'json',
      });
    }
    await esClient.deleteByQuery({
      index: ALERTS_INDEX,
      refresh: true,
      ignore_unavailable: true,
      query: { terms: { 'kibana.alert.rule.name': RULE_NAMES } },
    });
    await esClient.deleteByQuery({
      index: RISK_SCORE_INDEX,
      refresh: true,
      ignore_unavailable: true,
      query: { term: { 'host.risk.id_value': HOST_ID } },
    });
    await esClient.indices.delete({ index: SOURCE_INDEX, ignore_unavailable: true });
    await apiClient
      .post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      })
      .catch(() => {});
    await clearEntityStoreIndices(esClient);
  });

  apiTest('ranks risk inputs by their numeric risk score', async ({ apiClient, esClient }) => {
    await seedHostEntity(esClient, { entityId: HOST_ID, hostName: HOST_NAME });
    await esClient.index({
      index: SOURCE_INDEX,
      refresh: 'wait_for',
      document: { '@timestamp': new Date().toISOString(), host: { name: HOST_NAME } },
    });

    for (const [i, riskScore] of RULE_RISK_SCORES.entries()) {
      const response = await apiClient.post(DETECTION_ENGINE_RULES_URL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          type: 'query',
          name: RULE_NAMES[i],
          description: `Raises one alert with risk score ${riskScore}`,
          risk_score: riskScore,
          severity: 'high',
          index: [SOURCE_INDEX],
          query: `host.name: "${HOST_NAME}"`,
          from: 'now-1d',
          interval: '1h',
          enabled: true,
        },
      });
      expect(response).toHaveStatusCode(200);
      createdRuleIds.push(response.body.id);
    }
    await waitForAlerts(esClient, RULE_NAMES);

    await triggerMaintainerRun(apiClient, internalHeaders, 'risk-score', { sync: true });

    await esClient.indices.refresh({ index: RISK_SCORE_INDEX });
    const response = await esClient.search<{ host?: { risk?: { inputs?: RiskInput[] } } }>({
      index: RISK_SCORE_INDEX,
      size: 1,
      sort: [{ '@timestamp': 'desc' }],
      query: {
        bool: {
          filter: [
            { term: { 'host.risk.id_value': HOST_ID } },
            { term: { 'host.risk.score_type': 'base' } },
          ],
        },
      },
    });
    const inputs = response.hits.hits[0]?._source?.host?.risk?.inputs ?? [];

    expect(inputs.map((input) => input.risk_score)).toStrictEqual([100, 21, 9]);
    const contributions = inputs.map((input) => input.contribution_score);
    expect(contributions).toStrictEqual([...contributions].sort((a, b) => b - a));
  });
});
