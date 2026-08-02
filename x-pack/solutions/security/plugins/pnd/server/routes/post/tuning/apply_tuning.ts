/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  ApplyTuningRequestBody,
  ApplyTuningRequestParams,
  type ApplyTuningResponse,
  INTERNAL_API_ACCESS,
  PND_TUNABLE_RULE_FIELDS,
  PND_TUNING_APPLY_URL_TEMPLATE,
} from '@kbn/pnd-common';
import { RULES_API_ALL } from '@kbn/security-solution-features/constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import type { RouteDependencies } from '../../register_routes';
import { buildRulePatch } from './helpers/build_rule_patch';
import { findQueryChangeRefusal } from './helpers/find_query_change_refusal';
import { patchDetectionRule } from './helpers/patch_detection_rule';
import { resolveApprovedTuningTarget } from './helpers/resolve_approved_tuning';

/**
 * `POST /internal/pnd/tuning/{proposalId}/_apply` — apply an approved detection-rule tuning.
 *
 * Security finding S2 (a confused deputy): this route exists specifically so the detection-rule
 * write runs in the **approving user's** request context. The Task Manager API key that runs the
 * Detection Watch carries the *scheduling* user's privileges, and resuming a gate does not re-key
 * the execution, so a `kibana.request` PATCH from the workflow would execute as whoever closed the
 * incident, not as the engineer who approved the tuning. Here the UI calls the route with the
 * approving engineer's credentials, and {@link patchDetectionRule} forwards them to
 * `PATCH /api/detection_engine/rules` — so the identity that decided is the identity that acts.
 *
 * The route is gated on `RULES_API_ALL` (the detection-rules write privilege the underlying route
 * requires), so a caller without it gets a clean route-level `403`. Any non-2xx from the downstream
 * PATCH is surfaced **visibly** (403/404/400/5xx) rather than reported as a silent success — a
 * failed tuning must never look applied in the UI.
 *
 * The request carries `change` as a nested object and {@link buildRulePatch} flattens it into the
 * rule patch, because the detection-engine route reads rule fields at the top level: forwarding the
 * nested object would have it stripped by that route's own validation, and PND would report
 * `applied: true` for a rule it never modified.
 *
 * `proposalId` is bound to an answered, approved Post-Incident `await_apply_tuning` gate before any
 * detection-rule write. Missing, pending, dismissed, or non-Post-Incident ids are 404. The body
 * `id` / `rule_id` is not required to match the draft — the approval dialog exists so the analyst
 * can correct a hallucinated rule id.
 *
 * That same helper is B6a's third enforcement layer, and the only one that is a boundary rather than
 * a contract. The request schema already closes `change` to {@link PND_TUNABLE_RULE_FIELDS}, so
 * re-checking here looks redundant — it is not: **the schema is the contract, the route is the
 * boundary, and the model is not the only caller.** It catches a field a future schema edit widens by
 * accident, and it turns a rejected change into a visible `400` naming the field rather than a `200`
 * that applied less than the analyst approved. A change with no tunable field in it is refused for
 * the same reason: a no-op must never be reported as an applied tuning.
 *
 * {@link findQueryChangeRefusal} is the part of that boundary only the route can hold. `query` is
 * tunable now that the watch backtests both sides of the rewrite and the approval surfaces render the
 * diff, but it means something only on a rule whose `type` is `query` — and the request cannot carry
 * that fact. So the rule is re-fetched here, as the approving user, and a `query` patch aimed at any
 * other rule type is refused as a `400` naming the field, because the detection-engine route would
 * otherwise ignore the field and answer `200` on a rule whose detection logic never moved.
 */
export const registerApplyTuningRoute = ({
  getSpaceId,
  getStartServices,
  getWorkflowsManagementClient,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PND_TUNING_APPLY_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [RULES_API_ALL] },
      },
      summary: 'Apply an approved PND detection-rule tuning',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(ApplyTuningRequestBody),
            params: buildRouteValidationWithZod(ApplyTuningRequestParams),
          },
        },
      },
      async (_context, request, response) => {
        const { proposalId } = request.params;
        const managementClient = getWorkflowsManagementClient();
        if (managementClient == null) {
          return response.customError({
            statusCode: 503,
            body: { message: 'Workflows management API is not available' },
          });
        }

        // `rationale` is PND audit metadata, not a detection-rule field, so it never reaches the
        // patch; `change` is flattened into it, because the detection-engine route reads rule fields
        // at the top level and would strip a nested object — returning `200` on a rule it never
        // modified. Anything outside the allow-list — inside `change` or smuggled in at the top
        // level — comes back as `rejectedFields` instead of being dropped silently.
        const { changedFields, patch, rejectedFields } = buildRulePatch(request.body);

        const { id, rule_id: bodyRuleId } = request.body;
        const ruleIdentifier = id ?? bodyRuleId;

        if (ruleIdentifier == null) {
          return response.badRequest({
            body: { message: 'Tuning must identify a rule by "id" or "rule_id"' },
          });
        }

        // B6a layer 3, the only layer that is a boundary: a field outside
        // PND_TUNABLE_RULE_FIELDS is refused rather than dropped, so a caller is told that
        // the change it authorized is not the change that would have been made.
        if (rejectedFields.length > 0) {
          return response.badRequest({
            body: {
              message: `Tuning may not change ${rejectedFields.join(
                ', '
              )}; PND tunable fields are ${PND_TUNABLE_RULE_FIELDS.join(', ')}`,
            },
          });
        }

        // Without this a patch that identifies a rule and changes nothing would answer
        // `applied: true` — a silent no-op reported as a changed detection rule.
        if (changedFields.length === 0) {
          return response.badRequest({
            body: { message: 'Tuning must propose at least one change' },
          });
        }

        try {
          const [{ http }] = await getStartServices();
          const spaceId = getSpaceId(request);

          const target = await resolveApprovedTuningTarget({
            http,
            logger,
            managementClient,
            proposalId,
            request,
            spaceId,
          });

          if (target.status !== 'ok') {
            return response.notFound();
          }

          // `query` is tunable, but only on a rule whose `type` is `query`: the detection-engine
          // route ignores a `query` on any other type and still answers `200`, so PND would report
          // `applied: true` for a rule whose detection logic never moved. The rule is re-fetched as
          // the approving user to confirm the type, and anything else is refused as a `400` naming
          // the field. Unconfirmable is refused too — see the helper for why it never varies by
          // status.
          const queryChangeRefusal = await findQueryChangeRefusal({
            changedFields,
            http,
            id: request.body.id,
            request,
            spaceId,
          });

          if (queryChangeRefusal != null) {
            return response.badRequest({ body: { message: queryChangeRefusal } });
          }

          logger.info(
            `Applying PND tuning proposal "${proposalId}" to detection rule "${ruleIdentifier}" (${changedFields.join(
              ', '
            )})`
          );

          const { ruleId, status } = await patchDetectionRule({
            body: patch,
            http,
            request,
            spaceId,
          });

          if (status >= 200 && status < 300) {
            const body: ApplyTuningResponse = {
              applied: true,
              proposalId,
              ruleId: ruleId ?? ruleIdentifier,
            };
            return response.ok({ body });
          }

          // Surface the downstream failure visibly (S2): a 403 must not look like success.
          if (status === 403) {
            return response.forbidden({
              body: { message: 'Not authorized to apply the detection-rule tuning' },
            });
          }
          if (status === 404) {
            return response.notFound();
          }
          if (status === 400) {
            return response.badRequest({ body: { message: 'Invalid detection-rule tuning' } });
          }

          return response.customError({
            statusCode: status,
            body: { message: 'Failed to apply the detection-rule tuning' },
          });
        } catch (error) {
          logger.error(`Failed to apply PND tuning proposal "${proposalId}": ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to apply PND tuning' },
          });
        }
      }
    );
};
