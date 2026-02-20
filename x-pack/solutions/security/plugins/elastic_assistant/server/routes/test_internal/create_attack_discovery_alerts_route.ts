/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_SCHEDULES_CONSUMER_ID,
  CreateAttackDiscoveryAlertsParams,
} from '@kbn/elastic-assistant-common';
import { ALERT_INSTANCE_ID, ALERT_START, ALERT_TIME_RANGE, TIMESTAMP } from '@kbn/rule-data-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { ElasticAssistantPluginRouter } from '../../types';
import { ATTACK_DISCOVERY_ALERTS_CONTEXT } from '../../lib/attack_discovery/schedules/constants';
import { ATTACK_DISCOVERY_DATA_GENERATOR_RULE_TYPE_ID } from '../../lib/attack_discovery/data_generator_rule/constants';
import { getScheduledIndexPattern } from '../../lib/attack_discovery/persistence/get_scheduled_index_pattern';
import { generateAttackDiscoveryAlertHash } from '../../lib/attack_discovery/persistence/transforms/transform_to_alert_documents';

const RESPONSE_SCHEMA = z.object({ data: z.array(z.unknown()) });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getBackdatedTimestampByInstanceId = ({
  attackDiscoveries,
  connectorId,
  ownerId,
  replacements,
  spaceId,
}: {
  attackDiscoveries: CreateAttackDiscoveryAlertsParams['attackDiscoveries'];
  connectorId: CreateAttackDiscoveryAlertsParams['apiConfig']['connectorId'];
  ownerId: string;
  replacements: CreateAttackDiscoveryAlertsParams['replacements'];
  spaceId: string;
}): Record<string, string> => {
  // Deterministic fallback for missing/invalid timestamps:
  // Use the latest valid discovery timestamp as a proxy for the generator's end-of-window time.
  const fallbackNow = (() => {
    const times = attackDiscoveries
      .map((d) =>
        typeof d.timestamp === 'string' && d.timestamp.length > 0 ? new Date(d.timestamp) : null
      )
      .filter((d): d is Date => d != null && Number.isFinite(d.getTime()))
      .map((d) => d.getTime());
    const max = times.length > 0 ? Math.max(...times) : NaN;
    return Number.isFinite(max) ? new Date(max) : new Date();
  })();

  return attackDiscoveries.reduce<Record<string, string>>((acc, attackDiscovery) => {
    const desiredNow = (() => {
      const ts = attackDiscovery.timestamp;
      if (typeof ts !== 'string' || ts.length === 0) return fallbackNow;
      const d = new Date(ts);
      return Number.isFinite(d.getTime()) ? d : fallbackNow;
    })();

    const instanceId = generateAttackDiscoveryAlertHash({
      attackDiscovery,
      connectorId,
      ownerId,
      replacements,
      spaceId,
    });

    acc[instanceId] = desiredNow.toISOString();
    return acc;
  }, {});
};

const pollForAttackDiscoveryAlertDocumentIds = async ({
  esClient,
  index,
  expectedInstanceIds,
  timeoutMs,
}: {
  esClient: ElasticsearchClient;
  index: string;
  expectedInstanceIds: string[];
  timeoutMs: number;
}): Promise<Array<{ documentId: string; instanceId: string; concreteIndex: string }>> => {
  const start = Date.now();
  const uniqueExpectedInstanceIds = Array.from(new Set(expectedInstanceIds));
  const size = Math.max(uniqueExpectedInstanceIds.length, 1);

  let sleepMs = 250;
  while (Date.now() - start < timeoutMs) {
    const result = await esClient.search<unknown>({
      index,
      size,
      fields: [ALERT_INSTANCE_ID],
      _source: false,
      query: {
        terms: {
          [ALERT_INSTANCE_ID]: uniqueExpectedInstanceIds,
        },
      },
    });

    const hits = result.hits.hits;
    if (hits.length >= uniqueExpectedInstanceIds.length) {
      return hits.flatMap((h) => {
        const raw = (h.fields as Record<string, unknown> | undefined)?.[ALERT_INSTANCE_ID];
        const instanceId =
          Array.isArray(raw) && typeof raw[0] === 'string'
            ? raw[0]
            : typeof raw === 'string'
            ? raw
            : null;
        if (!instanceId || !h._id) return [];
        return [{ documentId: h._id, instanceId, concreteIndex: h._index }];
      });
    }

    await delay(sleepMs);
    sleepMs = Math.min(2_000, Math.round(sleepMs * 1.5));
  }

  throw new Error(
    `Timed out waiting for Attack discovery alerts to be persisted. expected=${uniqueExpectedInstanceIds.length}`
  );
};

const isPrivilegedDataGeneratorUser = (user: AuthenticatedUser | null | undefined): boolean => {
  if (!user) return false;
  if (user.roles?.includes('superuser')) return true;
  // Kibana may authenticate API-key requests as `_es_api_key` with no Kibana roles in serverless.
  // Treat API-key auth as privileged for this dev-only route (still gated at route registration time).
  if (user.authentication_type === 'api_key') return true;
  if (user.authentication_realm?.name === '_es_api_key') return true;
  if (user.api_key?.id) return true;
  return false;
};

const hasInternalKibanaOriginHeader = (headerValue: unknown): boolean => {
  // `@kbn/test`'s KbnClient overwrites this header to `kbn-client` (see `buildRequest()`),
  // while browser/internal calls commonly use `Kibana`.
  const allowed = new Set(['Kibana', 'kbn-client']);
  if (typeof headerValue === 'string') return allowed.has(headerValue);
  if (Array.isArray(headerValue)) return headerValue.some((v) => allowed.has(v));
  return false;
};

/**
 * Dev-only route used by the Security Solution data generator script.
 *
 * This route persists alerts via the Kibana alerting framework, so it does not write directly to
 * dot-prefixed indices with raw Elasticsearch bulk requests.
 */
export const createAttackDiscoveryAlertsRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: '/internal/elastic_assistant/data_generator/attack_discoveries/_create',
      security: {
        authz: {
          enabled: false,
          reason:
            'dev-only route for data generator; gated by route registration + internal-origin header',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: { body: buildRouteValidationWithZod(CreateAttackDiscoveryAlertsParams) },
          response: { 200: { body: { custom: buildRouteValidationWithZod(RESPONSE_SCHEMA) } } },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const assistantContext = await context.elasticAssistant;
          const authenticatedUser = await assistantContext.getCurrentUser();
          if (!authenticatedUser) return response.unauthorized();

          // This route is dev-only, but still requires an internal-origin request and a privileged user.
          // The data generator script sends this header.
          const internalOrigin = request.headers['x-elastic-internal-origin'];
          if (!hasInternalKibanaOriginHeader(internalOrigin)) {
            return response.forbidden({
              body: { message: 'Missing required x-elastic-internal-origin: Kibana header' },
            });
          }

          // Avoid relying solely on a spoofable header. This route is dev/staff-only at registration time,
          // but also requires a superuser-equivalent principal in practice (works in serverless API key flows).
          if (!isPrivilegedDataGeneratorUser(authenticatedUser)) {
            return response.forbidden({
              body: { message: 'Data generator route requires a privileged user' },
            });
          }

          const { rulesClient } = assistantContext;
          const spaceId = assistantContext.getSpaceId();

          // Pre-install Alerts-as-Data resources for this context/space to avoid first-run races
          // where the rule fires before its backing alias/index template exists.
          const init = await assistantContext.frameworkAlerts.getContextInitializationPromise(
            ATTACK_DISCOVERY_ALERTS_CONTEXT,
            spaceId
          );
          if (!init.result) {
            throw new Error(
              `Attack discovery alerts-as-data resources not initialized for space ${spaceId}: ${
                init.error ?? 'unknown error'
              }`
            );
          }

          let createdRule: { id: string };
          try {
            createdRule = await rulesClient.create({
              data: {
                name: 'Attack Discovery Data Generator (dev-only)',
                alertTypeId: ATTACK_DISCOVERY_DATA_GENERATOR_RULE_TYPE_ID,
                enabled: true,
                consumer: ATTACK_DISCOVERY_SCHEDULES_CONSUMER_ID,
                tags: ['attack_discovery', 'data_generator'],
                schedule: { interval: '1h' },
                actions: [],
                params: request.body,
              },
            });
          } catch (err) {
            throw new Error(`Failed to create data generator rule: ${err}`);
          }

          try {
            try {
              await rulesClient.runSoon({ id: createdRule.id, force: true });
            } catch (err) {
              throw new Error(`Failed to runSoon data generator rule ${createdRule.id}: ${err}`);
            }

            const expectedInstanceIds = request.body.attackDiscoveries.map((attackDiscovery) =>
              generateAttackDiscoveryAlertHash({
                attackDiscovery,
                connectorId: request.body.apiConfig.connectorId,
                ownerId: createdRule.id,
                replacements: request.body.replacements,
                spaceId,
              })
            );

            const esClient = assistantContext.core.elasticsearch.client.asCurrentUser;
            const index = getScheduledIndexPattern(spaceId);

            let createdDocs: Array<{
              documentId: string;
              instanceId: string;
              concreteIndex: string;
            }>;
            try {
              createdDocs = await pollForAttackDiscoveryAlertDocumentIds({
                esClient,
                index,
                expectedInstanceIds,
                // Keep this fast; we also avoid slow per-doc refreshes by using a single bulk update.
                timeoutMs: 20_000,
              });
            } catch (err) {
              throw new Error(`Timed out waiting for created attack discovery alerts: ${err}`);
            }

            const timestampByInstanceId = getBackdatedTimestampByInstanceId({
              attackDiscoveries: request.body.attackDiscoveries,
              connectorId: request.body.apiConfig.connectorId,
              ownerId: createdRule.id,
              replacements: request.body.replacements,
              spaceId,
            });

            // Backdate framework-owned fields after persistence so the generated alerts span the requested time range.
            // Use one bulk request (single refresh) to keep generation fast on fresh instances.
            const bulkOps = createdDocs.flatMap(({ documentId, instanceId, concreteIndex }) => {
              const ts = timestampByInstanceId[instanceId];
              if (!ts) return [];
              return [
                {
                  update: {
                    _index: concreteIndex,
                    _id: documentId,
                  },
                },
                {
                  doc: {
                    [TIMESTAMP]: ts,
                    [ALERT_START]: ts,
                    [ALERT_TIME_RANGE]: { gte: ts },
                  },
                },
              ];
            });

            if (bulkOps.length > 0) {
              try {
                await esClient.bulk({
                  refresh: true,
                  body: bulkOps,
                });
              } catch (err) {
                throw new Error(`Failed to bulk backdate attack discovery alerts: ${err}`);
              }
            }

            const createdDocumentIds = createdDocs.map(({ documentId }) => documentId);

            const dataClient = await assistantContext.getAttackDiscoveryDataClient();
            if (!dataClient) {
              return response.customError({
                statusCode: 500,
                body: { message: 'Attack discovery data client not initialized' },
              });
            }

            const { enableFieldRendering, withReplacements } = request.body;

            const data = (
              await dataClient.findAttackDiscoveryAlerts({
                authenticatedUser,
                esClient,
                findAttackDiscoveryAlertsParams: {
                  enableFieldRendering,
                  ids: createdDocumentIds,
                  page: 1,
                  perPage: createdDocumentIds.length,
                  sortField: '@timestamp',
                  withReplacements,
                },
                logger: assistantContext.logger,
              })
            ).data;

            return response.ok({ body: { data } });
          } finally {
            try {
              await rulesClient.delete({ id: createdRule.id });
            } catch (err) {
              assistantContext.logger.warn(
                `Failed to delete dev-only Attack Discovery data generator rule ${createdRule.id}: ${err}`
              );
            }
          }
        } catch (e) {
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: { message: error.message },
            bypassErrorFormat: true,
          });
        }
      }
    );
};
