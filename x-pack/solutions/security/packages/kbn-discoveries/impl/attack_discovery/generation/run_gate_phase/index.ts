/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import type { IEventLogger } from '@kbn/event-log-plugin/server';

import type { AttackDiscoverySource } from '../../persistence/event_logging';
import type {
  AlertRetrievalResult,
  WorkflowsManagementApi,
} from '../invoke_alert_retrieval_workflow';
import type { ParsedApiConfig, WorkflowExecutionTracking } from '../types';

import { dedupeCandidatesById } from '../dedupe_candidates_by_id';
import { invokeGateWorkflow } from '../invoke_gate_workflow';
import { parseEmbeddedAlertId } from '../parse_embedded_alert_id';
import { retrieveAnonymizedAlertsByIds } from '../retrieve_anonymized_alerts_by_ids';
import { selectKeptCandidates } from '../select_kept_candidates';
import { validateCandidateAlertIds } from '../validate_candidate_alert_ids';

export interface RunGatePhaseParams {
  alertsIndexPattern: string;
  anonymizationFields: AnonymizationFieldResponse[];
  apiConfig: ParsedApiConfig;
  authenticatedUser: AuthenticatedUser;
  /** The candidate alert set produced by the deterministic retrieval phase. */
  candidateResult: AlertRetrievalResult;
  /** Default alert retrieval workflow id, reserved for the skill's net-new additions. */
  defaultAlertRetrievalWorkflowId: string;
  end?: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  /** Always-on ground-truthing gate workflow id. */
  gateWorkflowId: string;
  logger: Logger;
  maxWaitMs?: number;
  request: KibanaRequest;
  size?: number;
  /** Toggle 1: whether the gate may retrieve net-new alerts of its own. */
  skillEnabled: boolean;
  source?: AttackDiscoverySource;
  spaceId: string;
  start?: string;
  workflowsManagementApi: WorkflowsManagementApi;
}

/**
 * Runs the always-on ground-truthing gate during the generation phase, after
 * the deterministic retrieval phase and before the untouched generation
 * workflow, and returns the post-gate `AlertRetrievalResult` for generation.
 *
 * Data fidelity:
 * - `_id` contract (principle 3): candidates lacking a recoverable `_id` are
 *   rejected loudly before the gate.
 * - richest-wins dedup (principle 4): duplicate `_id`s collapse to the richest.
 * - original-bytes pass-through (principles 1 & 2): the kept candidates'
 *   original alert strings are forwarded unchanged (never re-fetched).
 * - skill-added alerts (principle 6): net-new alerts the gate retrieved itself
 *   are the ONLY path that re-fetches + anonymizes by `_id`
 *   (`retrieveAnonymizedAlertsByIds`), since they have no anonymized upstream
 *   form.
 *
 * Fail-closed: `invokeGateWorkflow` (via `extractGateDecision`) throws when the
 * gate fails / times out, so the orchestration fails the run loudly rather than
 * silently passing the candidates through.
 */
export const runGatePhase = async ({
  alertsIndexPattern,
  anonymizationFields,
  apiConfig,
  authenticatedUser,
  candidateResult,
  defaultAlertRetrievalWorkflowId,
  end,
  eventLogger,
  eventLogIndex,
  executionUuid,
  gateWorkflowId,
  logger,
  maxWaitMs,
  request,
  size,
  skillEnabled,
  source,
  spaceId,
  start,
  workflowsManagementApi,
}: RunGatePhaseParams): Promise<AlertRetrievalResult> => {
  // _id contract (principle 3): reject id-less candidates loudly.
  const { rejectedAlerts, validCandidates } = validateCandidateAlertIds({
    alerts: candidateResult.alerts,
    logger,
  });

  if (rejectedAlerts.length > 0) {
    logger.error(
      `Gate _id contract violation: dropped ${rejectedAlerts.length} candidate alert(s) without a recoverable backing _id (execution_uuid=${executionUuid}). These cannot be ground-truthed and would be discarded downstream as hallucinations.`
    );
  }

  // richest-wins dedup (principle 4).
  const dedupedCandidates = dedupeCandidatesById(validCandidates);

  const { decision, workflowExecution: gateExecution } = await invokeGateWorkflow({
    alertsIndexPattern,
    apiConfig,
    authenticatedUser,
    candidateAlerts: dedupedCandidates.map(({ alert }) => alert),
    ...(end != null ? { end } : {}),
    eventLogger,
    eventLogIndex,
    executionUuid,
    logger,
    ...(maxWaitMs != null ? { maxWaitMs } : {}),
    request,
    ...(size != null ? { size } : {}),
    skillEnabled,
    ...(source != null ? { source } : {}),
    spaceId,
    ...(start != null ? { start } : {}),
    workflowId: gateWorkflowId,
    workflowsManagementApi,
  });

  // original-bytes pass-through (principles 1 & 2): forward the kept candidates'
  // original strings, never re-fetched or distilled.
  const keptCandidates = selectKeptCandidates({
    candidates: dedupedCandidates,
    keepAlertIds: decision.keepAlertIds,
  });
  const keptIds = new Set(keptCandidates.map(({ id }) => id));
  const keptAlerts = keptCandidates.map(({ alert }) => alert);
  const keptAnonymizedAlerts = candidateResult.anonymizedAlerts.filter((anonymizedAlert) => {
    const id = parseEmbeddedAlertId(anonymizedAlert.page_content);

    return id != null && keptIds.has(id);
  });

  // A keep id with no matching candidate has no original bytes to forward (in
  // sole-source mode the deterministic retrieval produced zero candidates, so
  // EVERY keep id falls here). Rather than silently drop these real alerts, fold
  // them into the re-fetch set alongside the gate's net-new additions — the `ids`
  // filter validates existence, so any hallucinated id is dropped while the
  // genuinely-retrieved keeps are recovered.
  const keptCandidateIds = new Set(keptCandidates.map(({ id }) => id));
  const unmatchedKeepIds = decision.keepAlertIds.filter(
    (id) => id.trim().length > 0 && !keptCandidateIds.has(id)
  );

  // skill-added alerts (principle 6): the ONLY re-fetch path. The gate returns
  // the backing `_id`s of any net-new alerts it retrieved (ids only, symmetric
  // with `keepAlertIds`); re-fetch + anonymize those ids so they match the
  // candidate set's anonymized form + replacements. Empty/whitespace ids are
  // dropped defensively, and unmatched keep ids are folded in (de-duplicated)
  // before the re-fetch.
  const addedAlertIds = [
    ...new Set([
      ...decision.addedAlertIds.filter((id) => id.trim().length > 0),
      ...unmatchedKeepIds,
    ]),
  ];

  const addedResult =
    addedAlertIds.length > 0
      ? await retrieveAnonymizedAlertsByIds({
          alertIds: addedAlertIds,
          alertsIndexPattern,
          anonymizationFields,
          apiConfig,
          logger,
          ...(maxWaitMs != null ? { maxWaitMs } : {}),
          request,
          spaceId,
          workflowId: defaultAlertRetrievalWorkflowId,
          workflowsManagementApi,
        })
      : undefined;

  const alerts = [...keptAlerts, ...(addedResult?.alerts ?? [])];

  // The gate runs during the generation phase, so its execution is tracked
  // separately from the deterministic alert-retrieval executions; the
  // monitoring UI surfaces `gateExecutions` under the Generation phase rather
  // than Alert retrieval. The net-new alert re-fetch the gate may trigger
  // (`retrieveAnonymizedAlertsByIds`) is an INTERNAL hydration detail of the
  // skill invocation — symmetric with the alert-retrieval-phase skill mode,
  // which deliberately does not event-log its own re-fetch — so it is folded
  // into this single gate entry rather than surfaced as a separate execution.
  // This keeps each workflow execution represented by exactly one entry under
  // the Generation phase (the gate/skill run, then the generate workflow).
  const gateExecutions: WorkflowExecutionTracking[] = [gateExecution];

  logger.info(
    `Gate phase completed: kept ${keptAlerts.length} of ${
      dedupedCandidates.length
    } candidate(s), added ${addedResult?.alerts.length ?? 0} skill alert(s)`
  );

  return {
    ...(decision.additionalContext != null
      ? { additionalContext: decision.additionalContext }
      : {}),
    alerts,
    alertsContextCount: alerts.length,
    anonymizedAlerts: [...keptAnonymizedAlerts, ...(addedResult?.anonymizedAlerts ?? [])],
    apiConfig: candidateResult.apiConfig,
    connectorName: candidateResult.connectorName,
    ...(decision.conversationId != null ? { conversationId: decision.conversationId } : {}),
    gateExecutions,
    replacements: { ...candidateResult.replacements, ...(addedResult?.replacements ?? {}) },
    workflowExecutions: candidateResult.workflowExecutions,
    workflowId: candidateResult.workflowId,
    workflowRunId: candidateResult.workflowRunId,
  };
};
