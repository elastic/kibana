/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_RULES_URL,
} from '../../../../../../common/constants';
import { getRiskScoreTimeSeriesIndex } from '../../../../../../common/entity_analytics/risk_engine/indices';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_ALIAS,
} from '../../fixtures/maintainers/constants';
import {
  clearEntityStoreIndices,
  triggerMaintainerRun,
  waitForEntityStoreRunning,
} from '../../fixtures/maintainers/helpers';

const ALERTS_INDEX = `${DEFAULT_ALERTS_INDEX}-default`;
// Matches the `logs-*` pattern log extraction reads, but not the `logs-*-*` data stream template.
const SOURCE_INDEX = 'logs-riskmultivalueidp';
const RISK_SCORE_INDEX = getRiskScoreTimeSeriesIndex();
const USER_EMAIL = 'risk-multi-value-idp@example.com';
const USER_ID = `user:${USER_EMAIL}@zscaler_zpa`;
const RULE_NAME = 'Risk multi-value IdP user rule';
const TEST_TIMEOUT_MS = 180_000;

interface UserEntitySource {
  entity?: { risk?: { calculated_score_norm?: number } };
}

const waitForAlerts = async (esClient: EsClient, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await esClient.indices.refresh({ index: ALERTS_INDEX, ignore_unavailable: true });
    const { count } = await esClient.count({
      index: ALERTS_INDEX,
      ignore_unavailable: true,
      query: { term: { 'kibana.alert.rule.name': RULE_NAME } },
    });
    if (count > 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for an alert from ${RULE_NAME}`);
};

const searchUserEntity = async (esClient: EsClient) => {
  await esClient.indices.refresh({ index: LATEST_ALIAS });
  return esClient.search<UserEntitySource>({
    index: LATEST_ALIAS,
    size: 2,
    query: { term: { 'entity.id': USER_ID } },
  });
};

apiTest.describe('Risk score maintainer multi-valued IdP user', { tag: ENTITY_STORE_TAGS }, () => {
  apiTest.setTimeout(TEST_TIMEOUT_MS);

  let defaultHeaders: Record<string, string>;
  let internalHeaders: Record<string, string>;
  let ruleId: string | undefined;

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

    // A scheduled run overlapping the manual run sees its score as stale and resets it to zero,
    // so let the first scheduled run finish before the test triggers its own.
    await expect
      .poll(
        async () => {
          const response = await apiClient.get(
            `${ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_GET}?ids=risk-score`,
            { headers: internalHeaders, responseType: 'json' }
          );
          const [maintainer] = response.body.maintainers ?? [];
          return maintainer?.lastSuccessTimestamp != null;
        },
        { timeout: 60_000, intervals: [1_000] }
      )
      .toBe(true);

    await esClient.indices.delete({ index: SOURCE_INDEX, ignore_unavailable: true });
    await esClient.indices.create({
      index: SOURCE_INDEX,
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          event: {
            properties: {
              kind: { type: 'keyword' },
              category: { type: 'keyword' },
              type: { type: 'keyword' },
              module: { type: 'keyword' },
            },
          },
          user: {
            properties: {
              email: { type: 'keyword' },
              name: { type: 'keyword' },
            },
          },
        },
      },
    });
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    if (ruleId) {
      await apiClient.delete(`${DETECTION_ENGINE_RULES_URL}?id=${ruleId}`, {
        headers: defaultHeaders,
        responseType: 'json',
      });
    }
    await esClient.deleteByQuery({
      index: ALERTS_INDEX,
      refresh: true,
      ignore_unavailable: true,
      query: { term: { 'kibana.alert.rule.name': RULE_NAME } },
    });
    await esClient.deleteByQuery({
      index: RISK_SCORE_INDEX,
      refresh: true,
      ignore_unavailable: true,
      query: { term: { 'user.risk.id_value': USER_ID } },
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

  apiTest(
    'scores an IdP user whose alert has the IAM event type after the first value',
    async ({ apiClient, esClient }) => {
      // `user` sorts after `info`, so a check on only the first doc value fails the IdP gate.
      const now = new Date();
      await esClient.index({
        index: SOURCE_INDEX,
        refresh: 'wait_for',
        document: {
          '@timestamp': now.toISOString(),
          event: {
            kind: 'event',
            category: ['iam'],
            type: ['info', 'user'],
            module: 'zscaler_zpa',
          },
          user: { email: USER_EMAIL, name: USER_EMAIL },
        },
      });

      const extractionResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION('user'),
        {
          headers: internalHeaders,
          responseType: 'json',
          body: {
            fromDateISO: new Date(now.getTime() - 60_000).toISOString(),
            toDateISO: new Date(now.getTime() + 60_000).toISOString(),
          },
        }
      );
      expect(extractionResponse).toHaveStatusCode(200);
      const extracted = await searchUserEntity(esClient);
      expect(extracted.hits.hits).toHaveLength(1);

      // The rule copies the source event fields, including the multi-valued event.type, onto the alert.
      const ruleResponse = await apiClient.post(DETECTION_ENGINE_RULES_URL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          type: 'query',
          name: RULE_NAME,
          description: 'Raises one alert for the IdP user',
          risk_score: 47,
          severity: 'medium',
          index: [SOURCE_INDEX],
          query: `user.email: "${USER_EMAIL}"`,
          from: 'now-1d',
          interval: '1h',
          enabled: true,
        },
      });
      expect(ruleResponse).toHaveStatusCode(200);
      ruleId = ruleResponse.body.id;
      await waitForAlerts(esClient);

      await triggerMaintainerRun(apiClient, internalHeaders, 'risk-score', { sync: true });

      const scored = await searchUserEntity(esClient);
      expect(scored.hits.hits).toHaveLength(1);
      expect(scored.hits.hits[0]._source?.entity?.risk?.calculated_score_norm).toBeGreaterThan(0);
    }
  );
});
