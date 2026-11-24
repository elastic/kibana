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
const SOURCE_INDEX = 'risk-resolution-reassignment-source';
const RISK_SCORE_INDEX = 'risk-score.risk-score-default';
const RISK_ENGINE_CONFIGURATION_URL =
  'api/saved_objects/risk-engine-configuration/risk-engine-configuration-default';
// The old target sorts before the new one, so it falls inside the second run's only page range.
const OLD_TARGET_HOST = 'risk-reassign-a';
const NEW_TARGET_HOST = 'risk-reassign-z';
const ALIAS_HOST = 'risk-reassign-alias';
const OLD_TARGET_ID = `host:${OLD_TARGET_HOST}`;
const NEW_TARGET_ID = `host:${NEW_TARGET_HOST}`;
const ALIAS_ID = `host:${ALIAS_HOST}`;
// More alerts than the new group's two, so the old target outscores it on a shared page.
const OLD_TARGET_ALERTS = 3;
const RULE_NAME = 'Risk resolution reassignment rule';
// Rule execution, alert polling and two synchronous maintainer runs don't fit the 60s default.
const TEST_TIMEOUT_MS = 240_000;

const seedAliasHostEntity = async (esClient: EsClient, resolvedTo: string) => {
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
        relationships: { resolution: { resolved_to: resolvedTo } },
      },
      host: { name: ALIAS_HOST },
      '@timestamp': now,
    },
  });
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

/** Counts the resolution score documents written for a target with a score above zero. */
const countPositiveResolutionScores = async (esClient: EsClient, targetId: string) => {
  await esClient.indices.refresh({ index: RISK_SCORE_INDEX });
  const { count } = await esClient.count({
    index: RISK_SCORE_INDEX,
    query: {
      bool: {
        filter: [
          { term: { 'host.risk.id_value': targetId } },
          { term: { 'host.risk.score_type': 'resolution' } },
          { range: { 'host.risk.calculated_score_norm': { gt: 0 } } },
        ],
      },
    },
  });
  return count;
};

apiTest.describe(
  'Risk score maintainer resolution reassignment',
  { tag: ENTITY_STORE_TAGS },
  () => {
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

      // Score hosts only: entity types run in parallel and each prunes the lookup index when it
      // finishes, so a faster type would otherwise clear the previous run's rows before host
      // resolution scoring reads them. One target per page makes the old target and the new
      // group compete for the same page.
      const configResponse = await apiClient.post(
        `${RISK_ENGINE_CONFIGURATION_URL}?overwrite=true`,
        {
          headers: defaultHeaders,
          responseType: 'json',
          body: {
            attributes: {
              dataViewId: ALERTS_INDEX,
              enabled: false,
              filter: {},
              identifierType: 'host',
              interval: '1h',
              pageSize: 1,
              range: { start: 'now-30d', end: 'now' },
              enableResetToZero: true,
              excludeAlertStatuses: ['closed'],
              filters: [],
              _meta: { mappingsVersion: 8 },
            },
          },
        }
      );
      expect(configResponse).toHaveStatusCode(200);

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
      await apiClient.delete(RISK_ENGINE_CONFIGURATION_URL, {
        headers: defaultHeaders,
        responseType: 'json',
      });
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
        query: { terms: { 'host.risk.id_value': [OLD_TARGET_ID, NEW_TARGET_ID, ALIAS_ID] } },
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
      "ignores the previous run's lookup row for a target whose only alias has moved",
      async ({ apiClient, esClient }) => {
        await seedHostEntity(esClient, { entityId: OLD_TARGET_ID, hostName: OLD_TARGET_HOST });
        await seedHostEntity(esClient, { entityId: NEW_TARGET_ID, hostName: NEW_TARGET_HOST });
        await seedAliasHostEntity(esClient, OLD_TARGET_ID);
        const sourceHosts = [
          ...Array.from({ length: OLD_TARGET_ALERTS }, () => OLD_TARGET_HOST),
          NEW_TARGET_HOST,
          ALIAS_HOST,
        ];
        for (const hostName of sourceHosts) {
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
            description: 'Raises one alert for each source document',
            risk_score: 50,
            severity: 'medium',
            index: [SOURCE_INDEX],
            query: `host.name: ("${OLD_TARGET_HOST}" or "${NEW_TARGET_HOST}" or "${ALIAS_HOST}")`,
            from: 'now-1d',
            interval: '1h',
            enabled: true,
          },
        });
        expect(ruleResponse).toHaveStatusCode(200);
        ruleId = ruleResponse.body.id;
        await waitForAlerts(esClient, sourceHosts.length);

        await triggerMaintainerRun(apiClient, internalHeaders, 'risk-score', { sync: true });
        expect(await countPositiveResolutionScores(esClient, OLD_TARGET_ID)).toBe(1);

        await seedAliasHostEntity(esClient, NEW_TARGET_ID);
        await triggerMaintainerRun(apiClient, internalHeaders, 'risk-score', { sync: true });

        // The lookup is pruned after scoring, so the second run still finds the row the first
        // run wrote for the old target. Scored from it, the old target would get a second
        // positive score and, ranking above the new group, push it off their shared page.
        expect(await countPositiveResolutionScores(esClient, OLD_TARGET_ID)).toBe(1);
        expect(await countPositiveResolutionScores(esClient, NEW_TARGET_ID)).toBe(1);
      }
    );
  }
);
