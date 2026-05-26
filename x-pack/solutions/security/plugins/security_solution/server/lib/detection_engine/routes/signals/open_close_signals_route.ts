/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  AuthenticatedUser,
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { DataViewAttributes } from '@kbn/data-views-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { getIndexListFromEsqlQuery } from '@kbn/securitysolution-utils';
import {
  ALERTS_API_ALL,
  ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE,
} from '@kbn/security-solution-features/constants';
import { ALERT_CLOSING_REASON_VALIDATION_ERROR } from './translations';
import { DefaultClosingReasonSchema } from '../../../../../common/types';
import { SetAlertsStatusRequestBody } from '../../../../../common/api/detection_engine/signals';
import { AlertStatusEnum } from '../../../../../common/api/model';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import {
  DEFAULT_ALERTS_INDEX,
  DEFAULT_DETECTIONS_CLOSE_REASONS_KEY,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
} from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { INSIGHTS_CHANNEL } from '../../../telemetry/constants';
import {
  createAlertStatusPayloads,
  getSessionIDfromKibanaRequest,
} from '../../../telemetry/insights';
import {
  getUpdateSignalStatusScript,
  setWorkflowStatusHandler,
} from '../common/set_workflow_status_handler';
import { getRuleByRuleId } from '../../rule_management/logic/detection_rules_client/methods/get_rule_by_rule_id';

export const setSignalsStatusRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  sender: ITelemetryEventsSender
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [
            { anyRequired: [ALERTS_API_ALL, ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE] },
          ],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SetAlertsStatusRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const { status } = request.body;

        const core = await context.core;
        const securitySolution = await context.securitySolution;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const siemClient = securitySolution?.getAppClient();
        const siemResponse = buildSiemResponse(response);
        const spaceId = securitySolution?.getSpaceId() ?? 'default';

        let reason;
        if (request.body.status === AlertStatusEnum.closed) {
          const customReasons = await core.uiSettings.client.get(
            DEFAULT_DETECTIONS_CLOSE_REASONS_KEY
          );
          const validReasons = new Set([...DefaultClosingReasonSchema.options, ...customReasons]);
          if (request.body.reason === undefined || validReasons.has(request.body.reason)) {
            reason = request.body.reason;
          } else {
            return siemResponse.error({
              body: ALERT_CLOSING_REASON_VALIDATION_ERROR(request.body.reason),
              statusCode: 400,
            });
          }
        }

        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        const user = core.security.authc.getCurrentUser();

        const clusterId = sender.getClusterID();
        const isTelemetryOptedIn = await sender.isTelemetryOptedIn();

        if (isTelemetryOptedIn && clusterId) {
          // Sometimes the ids are in the query not passed in the request?
          const toSendAlertIds =
            'signal_ids' in request.body
              ? request.body.signal_ids
              : (get(request.body.query, 'bool.filter.terms._id') as string[]);
          // Get Context for Insights Payloads
          const sessionId = getSessionIDfromKibanaRequest(clusterId, request);
          if (user?.username && toSendAlertIds && sessionId && status) {
            const insightsPayloads = createAlertStatusPayloads(
              clusterId,
              toSendAlertIds,
              sessionId,
              user.username,
              DETECTION_ENGINE_SIGNALS_STATUS_URL,
              status
            );
            logger.debug(() => `Sending Insights Payloads ${JSON.stringify(insightsPayloads)}`);
            await sender.sendOnDemand(INSIGHTS_CHANNEL, insightsPayloads);
          }
        }

        try {
          if ('signal_ids' in request.body) {
            // Use common handler for "by IDs" case
            const getIndexPattern = async () => `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
            return setWorkflowStatusHandler({
              context,
              request,
              response,
              getIndexPattern,
            });
          } else {
            const { conflicts, query, rule_ids: ruleStaticIds } = request.body;

            // Resolve the runtime mappings server-side from the rule's own
            // declared source indices.
            const rulesClient = await (await context.alerting).getRulesClient();
            const savedObjectsClient = core.savedObjects.client;
            const sourceIndices = await resolveSourceIndicesForRules(
              rulesClient,
              savedObjectsClient,
              ruleStaticIds,
              logger
            );
            const runtimeMappings = await resolveRuntimeMappingsFromIndices(
              esClient,
              sourceIndices,
              logger
            );

            const body = await updateSignalsStatusByQuery(
              status,
              query,
              { conflicts: conflicts ?? 'abort' },
              spaceId,
              esClient,
              user,
              reason,
              runtimeMappings
            );

            return response.ok({ body });
          }
        } catch (err) {
          // error while getting or updating signal with id: id in signal index .siem-signals
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};

/**
 * Please avoid using `updateSignalsStatusByQuery` when possible, use the common handler with "by IDs" instead.
 *
 * This method calls `updateByQuery` with `refresh: true` which is expensive on serverless.
 */
const updateSignalsStatusByQuery = async (
  status: SetAlertsStatusRequestBody['status'],
  query: object | undefined,
  options: { conflicts: 'abort' | 'proceed' },
  spaceId: string,
  esClient: ElasticsearchClient,
  user: AuthenticatedUser | null,
  reason?: string,
  runtimeMappings?: estypes.MappingRuntimeFields
) =>
  esClient.updateByQuery({
    index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
    conflicts: options.conflicts,
    refresh: true,
    script: getUpdateSignalStatusScript(status, user, reason),
    query: {
      bool: {
        filter: query,
      },
    },
    // `runtime_mappings` is a valid top-level field on the ES updateByQuery
    // wire protocol but isn't typed in the @elastic/elasticsearch client.
    // Threading it through `body` keeps the call type-safe; the keys forbidden
    // there (query/script/conflicts/etc.) are already passed at the top level.
    body:
      runtimeMappings && Object.keys(runtimeMappings).length > 0
        ? { runtime_mappings: runtimeMappings }
        : undefined,
    ignore_unavailable: true,
  });

/**
 * Read the `runtime` block from each provided index's mapping and merge them
 * into a single `runtime_mappings` object suitable for an ES query body. This
 * is how the bulk-close path supports runtime fields defined directly on ES
 * index mappings (the documented workaround in elastic/security-ml#677): field
 * caps doesn't return the Painless script source, so we have to hit
 * `GET <index>/_mapping` server-side and pull the definitions from there.
 *
 * Conflict handling: if two indices define the same runtime field name with
 * different scripts or types, last-write-wins (deterministic by the order ES
 * returns the indices). A warning is logged so the conflict is visible —
 * realistically rare, since the motivating workaround applies the same script
 * everywhere, but possible with multi-index data views.
 *
 * Failures are logged and treated as no-op — a missing or unauthorised index
 * shouldn't fail the close, it just means no runtime fields are attached.
 */
const resolveRuntimeMappingsFromIndices = async (
  esClient: ElasticsearchClient,
  indices: string[] | undefined,
  logger: Logger
): Promise<estypes.MappingRuntimeFields | undefined> => {
  if (!indices || indices.length === 0) return undefined;

  try {
    const mappings = await esClient.indices.getMapping({
      index: indices,
      ignore_unavailable: true,
      allow_no_indices: true,
    });

    const merged: estypes.MappingRuntimeFields = {};
    const sources: Record<string, string> = {};

    for (const [indexName, indexMapping] of Object.entries(mappings)) {
      const runtime = indexMapping?.mappings?.runtime;
      if (runtime) {
        for (const [name, def] of Object.entries(runtime)) {
          const existing = merged[name];
          if (existing !== undefined && !areRuntimeFieldsEqual(existing, def)) {
            logger.warn(
              `Conflicting runtime field definitions for "${name}" while resolving bulk-close runtime_mappings: ` +
                `[${sources[name]}] vs [${indexName}]. Last-write-wins; closing alerts using the definition from [${indexName}].`
            );
          }
          merged[name] = def as estypes.MappingRuntimeField;
          sources[name] = indexName;
        }
      }
    }
    return Object.keys(merged).length > 0 ? merged : undefined;
  } catch (err) {
    logger.warn(
      `Failed to resolve runtime mappings from indices [${indices.join(', ')}] for bulk close: ${
        err?.message ?? err
      }`
    );
    return undefined;
  }
};

// `Script` has several shapes (inline source, stored id, params, etc.) so a
// structural equality check via JSON serialisation is the pragmatic choice
// for "are these two definitions the same?" — false negatives are acceptable
// here because the only effect is logging a warning we'd otherwise miss.
const areRuntimeFieldsEqual = (
  a: estypes.MappingRuntimeField,
  b: estypes.MappingRuntimeField
): boolean => a.type === b.type && JSON.stringify(a.script) === JSON.stringify(b.script);

/**
 * Resolve the set of source index patterns declared by the given detection
 * rules. Used by bulk-close to scope server-side `_mapping` reads to the
 * rules' own indices — the user supplies rule_ids; they do not pick which
 * indices are read from.
 *
 * Per rule type:
 *  - rules with `params.dataViewId`: load the data view saved object and use
 *    its `title` (comma-separated index patterns).
 *  - ML rules: use the `.ml-anomalies-*` wildcard. We don't dereference the
 *    job's `results_index_name` here — the ML rule executor itself queries
 *    the wildcard, and our user-scoped esClient is bounded by the user's
 *    existing ML index privileges.
 *  - rules with `params.index`: use those patterns directly.
 *  - anything else (e.g. ES|QL): skipped — runtime field workarounds are not
 *    a documented pattern for those rule types yet.
 *
 * Missing/unloadable rules are logged and skipped. The function always
 * returns an array (possibly empty); callers tolerate emptiness as "no
 * runtime mappings to attach".
 */
const resolveSourceIndicesForRules = async (
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  ruleStaticIds: string[] | undefined,
  logger: Logger
): Promise<string[]> => {
  if (!ruleStaticIds || ruleStaticIds.length === 0) return [];

  const indices = new Set<string>();
  for (const ruleId of ruleStaticIds) {
    const perRule = await resolveIndicesForRule(rulesClient, savedObjectsClient, ruleId, logger);
    for (const pattern of perRule) indices.add(pattern);
  }
  return Array.from(indices);
};

const resolveIndicesForRule = async (
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  ruleId: string,
  logger: Logger
): Promise<string[]> => {
  const rule = await loadRule(rulesClient, ruleId, logger);
  if (!rule) return [];

  if ('data_view_id' in rule && rule.data_view_id) {
    return resolveDataViewIndices(savedObjectsClient, rule.data_view_id, ruleId, logger);
  }
  if (rule.type === 'machine_learning') {
    // The ML rule executor itself queries the `.ml-anomalies-*` wildcard; our
    // user-scoped esClient is already bounded by the user's ML index privileges,
    // so we don't need to dereference `results_index_name` per job.
    return ['.ml-anomalies-*'];
  }
  if ('index' in rule && Array.isArray(rule.index)) {
    return rule.index;
  }
  if (rule.type === 'esql') {
    // ES|QL rules carry their source indices inside the query string, parsed
    // by the same helper the exception flyout uses on the client.
    return getIndexListFromEsqlQuery(rule.query);
  }

  return [];
};

const loadRule = async (rulesClient: RulesClient, ruleId: string, logger: Logger) => {
  try {
    return await getRuleByRuleId({ rulesClient, ruleId });
  } catch (err) {
    logger.warn(
      `bulk-close: failed to load rule_id "${ruleId}" for runtime mapping resolution: ${
        err?.message ?? err
      }`
    );
    return null;
  }
};

const resolveDataViewIndices = async (
  savedObjectsClient: SavedObjectsClientContract,
  dataViewId: string,
  ruleId: string,
  logger: Logger
): Promise<string[]> => {
  try {
    const dv = await savedObjectsClient.get<DataViewAttributes>('index-pattern', dataViewId);
    return dv.attributes.title
      .split(',')
      .map((pattern) => pattern.trim())
      .filter(Boolean);
  } catch (err) {
    logger.warn(
      `bulk-close: failed to load data view "${dataViewId}" for rule_id "${ruleId}": ${
        err?.message ?? err
      }`
    );
    return [];
  }
};
