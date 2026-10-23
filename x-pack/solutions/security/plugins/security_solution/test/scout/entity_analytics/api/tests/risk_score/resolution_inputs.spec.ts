/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../common/constants';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_ALIAS,
} from '../../fixtures/maintainers/constants';
import {
  clearEntityStoreIndices,
  seedHostEntity,
  triggerMaintainerRun,
  waitForEntityStoreRunning,
} from '../../fixtures/maintainers/helpers';

const ALERTS_INDEX = '.alerts-security.alerts-default';
const SOURCE_INDEX = 'risk-resolution-inputs-source';
const RISK_SCORE_INDEX = 'risk-score.risk-score-default';
const TARGET_HOST = 'risk-resolution-target';
const ALIAS_HOST = 'risk-resolution-alias';
// In no resolution group, but its ID sorts inside the target's page range.
const PLAIN_HOST = 'risk-resolution-plain';
const TARGET_ID = `host:${TARGET_HOST}`;
const ALIAS_ID = `host:${ALIAS_HOST}`;
const PLAIN_ID = `host:${PLAIN_HOST}`;
const RULE_NAME = 'Risk resolution inputs rule';
const STAMP_FIELD = 'kibana.alert.entity.id';
// Rule execution, alert polling and a synchronous maintainer run don't fit the 60s default.
const TEST_TIMEOUT_MS = 180_000;

interface RiskInput {
  id: string;
  timestamp: string;
}

const seedAliasHostEntity = async (esClient: EsClient) => {
  const now = new Date().toISOString();
  await esClient.index({
    index: LATEST_ALIAS,
    id: hashEuid(ALIAS_ID),
    refresh: 'wait_for',
    pipeline: '_none',
    document: {
      entity: {
        id: ALIAS_ID,
        name: ALIAS_HOST,
        EngineMetadata: { Type: 'host' },
        lifecycle: { first_seen: now, last_seen: now },
        relationships: { resolution: { resolved_to: TARGET_ID } },
      },
      host: { name: ALIAS_HOST },
      '@timestamp': now,
    },
  });
};

/** The entity IDs stamped on the rule's alert for a host. */
const getStampedEntityIds = async (esClient: EsClient, hostName: string) => {
  const response = await esClient.search({
    index: ALERTS_INDEX,
    size: 1,
    fields: [STAMP_FIELD],
    _source: false,
    query: {
      bool: {
        filter: [
          { term: { 'kibana.alert.rule.name': RULE_NAME } },
          { term: { 'host.name': hostName } },
        ],
      },
    },
  });
  return response.hits.hits[0]?.fields?.[STAMP_FIELD] ?? [];
};

const waitForAlerts = async (esClient: EsClient, expected: number, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await esClient.indices.refresh({ index: ALERTS_INDEX, ignore_unavailable: true });
    const { count } = await esClient.count({
      index: ALERTS_INDEX,
      ignore_unavailable: true,
      query: { term: { 'kibana.alert.rule.name': RULE_NAME } },
    });
    if (count >= expected) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for ${expected} alerts from ${RULE_NAME}`);
};

apiTest.describe('Risk score maintainer resolution inputs', { tag: ENTITY_STORE_TAGS }, () => {
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
      query: { terms: { 'host.risk.id_value': [TARGET_ID, ALIAS_ID, PLAIN_ID] } },
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
    "scores only the group's members, stamped or not, with each alert's own timestamp",
    async ({ apiClient, esClient }) => {
      await seedHostEntity(esClient, { entityId: TARGET_ID, hostName: TARGET_HOST });
      await seedHostEntity(esClient, { entityId: PLAIN_ID, hostName: PLAIN_HOST });
      await seedAliasHostEntity(esClient);
      for (const hostName of [TARGET_HOST, ALIAS_HOST, PLAIN_HOST]) {
        await esClient.index({
          index: SOURCE_INDEX,
          refresh: 'wait_for',
          document: { '@timestamp': new Date().toISOString(), host: { name: hostName } },
        });
      }

      const ruleResponse = await apiClient.post(DETECTION_ENGINE_RULES_URL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          type: 'query',
          name: RULE_NAME,
          description: 'Raises one alert for each host',
          risk_score: 50,
          severity: 'medium',
          index: [SOURCE_INDEX],
          query: `host.name: ("${TARGET_HOST}" or "${ALIAS_HOST}" or "${PLAIN_HOST}")`,
          from: 'now-1d',
          interval: '1h',
          enabled: true,
        },
      });
      expect(ruleResponse).toHaveStatusCode(200);
      ruleId = ruleResponse.body.id;
      await waitForAlerts(esClient, 3);

      // Alerts carry their entity IDs, which resolution scoring uses to read only a page's members'
      // alerts. Alerts from before the stamp have none and must still count, so the alias's alert
      // loses its stamp here while the target's keeps it.
      expect(await getStampedEntityIds(esClient, TARGET_HOST)).toContain(TARGET_ID);
      await esClient.updateByQuery({
        index: ALERTS_INDEX,
        refresh: true,
        conflicts: 'proceed',
        query: {
          bool: {
            filter: [
              { term: { 'kibana.alert.rule.name': RULE_NAME } },
              { term: { 'host.name': ALIAS_HOST } },
            ],
          },
        },
        script: {
          lang: 'painless',
          // The stamp may be stored under a dotted key or as nested objects.
          source: `ctx._source.remove('${STAMP_FIELD}');
            def kibana = ctx._source.kibana;
            if (kibana instanceof Map && kibana.alert instanceof Map && kibana.alert.entity instanceof Map) {
              kibana.alert.entity.remove('id');
            }`,
        },
      });
      expect(await getStampedEntityIds(esClient, ALIAS_HOST)).toStrictEqual([]);

      await triggerMaintainerRun(apiClient, internalHeaders, 'risk-score', { sync: true });

      const alerts = await esClient.search<{ '@timestamp': string }>({
        index: ALERTS_INDEX,
        size: 10,
        query: { term: { 'kibana.alert.rule.name': RULE_NAME } },
        fields: ['kibana.alert.uuid'],
      });
      const alertTimestamps = new Map(
        alerts.hits.hits.map((hit) => [
          String(hit.fields?.['kibana.alert.uuid']?.[0]),
          hit._source?.['@timestamp'],
        ])
      );

      await esClient.indices.refresh({ index: RISK_SCORE_INDEX });
      const response = await esClient.search<{ host?: { risk?: { inputs?: RiskInput[] } } }>({
        index: RISK_SCORE_INDEX,
        size: 1,
        sort: [{ '@timestamp': 'desc' }],
        query: {
          bool: {
            filter: [
              { term: { 'host.risk.id_value': TARGET_ID } },
              { term: { 'host.risk.score_type': 'resolution' } },
            ],
          },
        },
      });
      const inputs = response.hits.hits[0]?._source?.host?.risk?.inputs ?? [];

      expect(inputs).toHaveLength(2);
      for (const input of inputs) {
        expect(alertTimestamps.has(input.id)).toBe(true);
        expect(input.timestamp).toBe(alertTimestamps.get(input.id));
      }

      const plainResolutionScores = await esClient.count({
        index: RISK_SCORE_INDEX,
        query: {
          bool: {
            filter: [
              { term: { 'host.risk.id_value': PLAIN_ID } },
              { term: { 'host.risk.score_type': 'resolution' } },
            ],
          },
        },
      });
      expect(plainResolutionScores.count).toBe(0);
    }
  );
});
