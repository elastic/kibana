/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  GetExecutionRequestParams,
  type GetExecutionResponse,
  INTERNAL_API_ACCESS,
  PND_EXECUTION_URL_TEMPLATE,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';

import type { RouteDependencies } from '../../register_routes';
import { getLiveExecutionReadAuthz } from '../../watches/watch_route_security';
import { correlateExecutions } from '../runs/helpers/correlate_executions';
import { findAttackDiscoveryAlerts } from '../conversations/helpers/find_attack_discovery_alerts';
import { buildExecutionCorrelationHeaders } from './helpers/build_execution_correlation_headers';
import { buildExecutionSteps } from './helpers/build_execution_steps';
import { fetchStepExecutions } from './helpers/fetch_step_executions';
import { selectLatestRunPerWorkflow } from './helpers/select_latest_run_per_workflow';
import { selectStepExecutions } from './helpers/select_step_executions';

/**
 * The workflows whose executions this projection aggregates: the Watch Floor drives Signal Triage →
 * Investigation → Incident Response (the lane moved there from the Deep Watch in kibana-phf4.5,
 * ADR-015), and the Post-Incident Watch drafts and applies the rule tuning (Phase 4).
 *
 * One discovery is realized by at most one run of each, correlated by the Attack Discovery id decoded
 * from each run's `context.event`.
 *
 * The catalog's two `upstream` rows need no third workflow here: Attack Discovery performs that work
 * before PND is invoked, so those rows are resolved from the catalog rather than from an execution.
 */
const CORRELATED_WORKFLOW_IDS = [
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
] as const;

/**
 * How many recent executions **per workflow** to scan for the target discovery. Execution `context`
 * is unmapped (`dynamic: false`), so correlation is retrieve-then-filter, never a term query; a
 * discovery's runs are found among the most recent executions of the known workflow ids.
 *
 * `correlateExecutions` caps the *merged* result too, so the cap is multiplied by the workflow count
 * below — otherwise both workflows share one window and a busy watch can push the other's run out of
 * it, which surfaces as an all-`not_started` skeleton with no error. That is also why the response
 * carries an explicit "did anything correlate" header.
 */
const EXECUTION_CORRELATION_SIZE_PER_WORKFLOW = 100;

/**
 * The Watch Floor step whose output carries the final per-action containment ledger. The
 * execute_* foreach blocks fan out into many transient step executions, so the projection
 * reads the one stable collector instead — its `containment_executed_actions` output key is
 * the contract with `watch_floor.yaml`'s `collect_executed_actions` step.
 */
const COLLECT_EXECUTED_ACTIONS_STEP_ID = 'collect_executed_actions';

const MAX_CONTAINMENT_ACTIONS = 200;

/**
 * Read the per-action containment execution ledger from the correlated step executions, or
 * `undefined` when the run has not reached (or recorded) it. Fail-open to absence: a ledger
 * of unexpected shape must degrade to "no ledger" rather than fail the whole projection.
 */
const extractContainmentActions = (
  stepExecutions: readonly WorkflowStepExecutionDto[]
): Array<Record<string, unknown>> | undefined => {
  const collector = stepExecutions
    .filter((step) => step.stepId === COLLECT_EXECUTED_ACTIONS_STEP_ID && step.output != null)
    .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))[0];

  if (collector == null || typeof collector.output !== 'object' || collector.output == null) {
    return undefined;
  }

  const ledger = (collector.output as Record<string, unknown>).containment_executed_actions;
  if (!Array.isArray(ledger)) {
    return undefined;
  }

  return ledger
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry != null)
    .slice(0, MAX_CONTAINMENT_ACTIONS);
};

/**
 * `GET /internal/pnd/executions/{correlationId}` — the four-phase execution projection.
 *
 * Returns the always-complete 16-row four-phase skeleton (the twelve catalog steps plus the four
 * phase-gate rows) for one Attack Discovery, overlaying live status onto the rows PND executes and
 * marking the two `upstream` rows `upstream`, because Attack Discovery performs that work before PND
 * is invoked. Rows are matched to real step executions aggregated across the Watch Floor **and**
 * Post-Incident Watch runs, correlated by the discovery id via {@link correlateExecutions} — the same
 * shared primitive the runs list uses, never a second copy — and narrowed to one run per workflow by
 * {@link selectLatestRunPerWorkflow} so a re-trigger never resolves to a stale run.
 *
 * Every row that has a step execution carries that step's own step-level Workflows deep link (F1).
 * An answered gate — human or auto-approver — lands on the `waitForInput` step itself. An
 * `upstream` row carries none, because no PND step execution realizes it.
 *
 * Because the skeleton is always complete, "no run correlated to this discovery" cannot be expressed
 * in the body: it is stamped as the {@link PND_EXECUTION_CORRELATED_HEADER} response header, so the
 * caller can render a "could not correlate" state rather than a blank timeline.
 *
 * S3 (IDOR): the discovery is resolved **as the calling user** via `GET /api/attack_discovery/_find`
 * and a `404` is returned when it is not readable — never `asInternalUser`. The space is always
 * taken from the request, never a parameter (S9).
 */
export const registerGetExecutionRoute = ({
  getSpaceId,
  getStartServices,
  getWorkflowsManagementClient,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_EXECUTION_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: getLiveExecutionReadAuthz(),
      },
      summary: 'Get the four-phase execution projection for an Attack Discovery alert',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetExecutionRequestParams),
          },
        },
      },
      async (_context, request, response) => {
        const { correlationId } = request.params;

        try {
          const managementClient = getWorkflowsManagementClient();
          if (managementClient == null) {
            return response.customError({
              statusCode: 503,
              body: { message: 'Workflows management API is not available' },
            });
          }

          const spaceId = getSpaceId(request);

          // S3: resolve the discovery as the calling user; 404 when it is not readable.
          const [{ http }] = await getStartServices();
          const [alert] = await findAttackDiscoveryAlerts({
            http,
            ids: [correlationId],
            request,
            spaceId,
          });

          if (alert == null) {
            return response.notFound();
          }

          const correlated = await correlateExecutions({
            logger,
            managementClient,
            mergedSize: EXECUTION_CORRELATION_SIZE_PER_WORKFLOW * CORRELATED_WORKFLOW_IDS.length,
            request,
            size: EXECUTION_CORRELATION_SIZE_PER_WORKFLOW,
            spaceId,
            watchIds: CORRELATED_WORKFLOW_IDS,
          });

          // One run per workflow, newest first: re-triggering a discovery correlates more than one
          // run of the same workflow, and a stale run's step could otherwise win the projection and
          // point a row's deep link at an older execution.
          const runIds = selectLatestRunPerWorkflow(
            correlated.filter((c) => c.correlationId === correlationId)
          );

          const stepExecutions = await fetchStepExecutions({
            logger,
            managementClient,
            request,
            runIds,
            spaceId,
          });

          const steps = buildExecutionSteps({
            stepExecutionsByStepId: selectStepExecutions(stepExecutions),
          });

          const containmentActions = extractContainmentActions(stepExecutions);

          const body: GetExecutionResponse = {
            correlationId,
            steps,
            ...(containmentActions ? { containmentActions } : {}),
          };

          // The skeleton is always complete, so "no run correlated" can only be said in a header.
          return response.ok({
            body,
            headers: buildExecutionCorrelationHeaders(runIds.length > 0),
          });
        } catch (error) {
          logger.error(
            `Failed to build the PND execution projection for Attack Discovery alert "${correlationId}": ${error}`
          );
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to build the PND execution projection' },
          });
        }
      }
    );
};
