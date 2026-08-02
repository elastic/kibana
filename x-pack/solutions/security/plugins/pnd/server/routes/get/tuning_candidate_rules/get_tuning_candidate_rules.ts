/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  GetCandidateRulesRequestQuery,
  type GetCandidateRulesResponse,
  INTERNAL_API_ACCESS,
  PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS,
  PND_TUNING_CANDIDATE_RULES_URL,
  type PndCandidateRule,
} from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import { PND_API_PRIVILEGE_READ } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { findAttackDiscoveryAlerts } from '../conversations/helpers/find_attack_discovery_alerts';
import { buildDiscoveryAlertIds } from '../discovery_context/helpers/build_discovery_alert_ids';
import { fetchDetectionRule } from '../../helpers/fetch_detection_rule';
import {
  PND_CANDIDATE_RULES_AGG_NAME,
  buildCandidateRulesQuery,
} from './helpers/build_candidate_rules_query';
import { filterCandidateRulesByRef } from './helpers/filter_candidate_rules_by_ref';
import { projectCandidateRule } from './helpers/project_candidate_rule';

/** The shape {@link buildCandidateRulesQuery}'s `aggs` produces, as far as this route reads it. */
interface CandidateRulesAggregations {
  [PND_CANDIDATE_RULES_AGG_NAME]?: { buckets: Array<{ key: string }> };
}

/**
 * `GET /internal/pnd/tuning/candidate-rules` — the distinct detection rules behind one Attack
 * Discovery's constituent alerts, projected as the menu a tuning draft chooses from (register `#24`).
 *
 * It exists because `draft_tuning` runs with `NO_TOOLS`. Asked to name the rule it is tuning, the
 * model either recalls a prebuilt `rule_id` from training data — which is not the saved-object id
 * `_apply` patches, so `_apply` 404s — or answers `"UNKNOWN"`. Handing it the rules that actually
 * fired turns a recall into a choice, and makes `TuningApprovalDialog`'s editable rule-id field a
 * correction rather than a requirement on every run.
 *
 * A dedicated route rather than more of `_derive`: a rule-lookup failure must not take the agent id
 * down with it. `_derive`'s "agent existence and agent-id availability degrade together" property
 * (ADR-011) is load-bearing, so this reads through its own step with its own
 * `on-failure: { continue: true }`.
 *
 * ## What keeps this from being an IDOR
 *
 * The route is handed a discovery id by the client, so three things are load-bearing:
 *
 * 1. The discovery is resolved through {@link findAttackDiscoveryAlerts}, which reads
 *    `GET /api/attack_discovery/_find` **as the calling user** over Core's HTTP self client (S3,
 *    D7) — never `asInternalUser`. A discovery the caller cannot read resolves to nothing.
 * 2. That "nothing" is a **404**, not an empty menu. An empty menu is a real answer here ("this
 *    discovery's alerts name no rule you can read"), so returning it for an unreadable id would
 *    both hide the authorization failure and tell the drafting step something false.
 * 3. The alerts index is read as `asCurrentUser` and each rule is fetched as the caller too, so a
 *    readable discovery still cannot surface an alert or a rule the caller may not see. An
 *    unreadable rule is simply absent from the menu rather than an error, which keeps rule
 *    existence non-observable.
 *
 * ## Why the fan-out is bounded twice
 *
 * The discovery's `alert_ids` become `ids` filter clauses in one aggregation, so the count is capped
 * at `PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS` with a **400 raised before any query runs**. The cap is
 * deliberately a refusal rather than a truncation: silently querying the first 200 of a longer list
 * would narrow the menu while the drafting step believed it saw every rule, which is the same
 * dishonesty as a truncated `query`. The distinct rules are then capped at
 * `PND_TUNING_CANDIDATE_RULES_MAX` by the aggregation's `terms` size, because each bucket costs one
 * scoped rules-API read.
 *
 * A genuine failure is a visible **500**, not `rules: []` — the opposite choice from
 * `/discovery-context`, and for the reason that route's own comment names: an empty list there is an
 * absent overlay on a queue that renders fine without it, while an empty menu here is an
 * affirmative claim that no rule is tunable. The watch step's `on-failure: { continue: true }`
 * degrades a 500 to exactly today's behaviour, so the honest error costs nothing.
 */
export const registerGetTuningCandidateRulesRoute = ({
  getEsClient,
  getSpaceId,
  getStartServices,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_TUNING_CANDIDATE_RULES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'Get the detection rules a tuning draft may choose among for an Attack Discovery',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetCandidateRulesRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        const { correlationId, ruleRef } = request.query;

        try {
          const spaceId = getSpaceId(request);
          const [{ http }] = await getStartServices();

          // S3: resolve the discovery as the calling user before anything reads an alert.
          const alerts = await findAttackDiscoveryAlerts({
            http,
            ids: [correlationId],
            request,
            spaceId,
          });

          if (alerts.length === 0) {
            return response.notFound();
          }

          const alertIdsByDiscoveryId = buildDiscoveryAlertIds({
            alerts,
            readableAttackDiscoveryAlertIds: new Set([correlationId]),
          });
          const alertIds = alertIdsByDiscoveryId[correlationId] ?? [];

          // The discovery resolved but correlates no constituent alerts, so it names no rule. That
          // is a real (empty) answer rather than a failure.
          if (alertIds.length === 0) {
            return response.ok({ body: { rules: [] } });
          }

          // Before the query, not after: see the fan-out note above.
          if (alertIds.length > PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS) {
            return response.badRequest({
              body: {
                message: `Attack Discovery alert "${correlationId}" correlates more than ${PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS} alerts`,
              },
            });
          }

          const esClient = await getEsClient(context);
          const { aggregations } = await esClient.asCurrentUser.search<
            unknown,
            CandidateRulesAggregations
          >(buildCandidateRulesQuery({ alertIds, spaceId }));

          const ruleIds = (aggregations?.[PND_CANDIDATE_RULES_AGG_NAME]?.buckets ?? []).map(
            ({ key }) => key
          );

          logger.debug(
            () =>
              `Projecting ${ruleIds.length} PND tuning candidate rules for Attack Discovery "${correlationId}" in space "${spaceId}"`
          );

          const fetched = await Promise.all(
            ruleIds.map((id) => fetchDetectionRule({ http, id, request, spaceId }))
          );

          const rules = fetched.reduce<PndCandidateRule[]>((acc, { rule }) => {
            const candidate = projectCandidateRule(rule);
            return candidate == null ? acc : [...acc, candidate];
          }, []);

          const body: GetCandidateRulesResponse = {
            rules: filterCandidateRulesByRef({ ruleRef, rules }),
          };

          return response.ok({ body });
        } catch (error) {
          logger.error(
            `Failed to derive PND tuning candidate rules for Attack Discovery "${correlationId}": ${error}`
          );
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to derive PND tuning candidate rules' },
          });
        }
      }
    );
};
