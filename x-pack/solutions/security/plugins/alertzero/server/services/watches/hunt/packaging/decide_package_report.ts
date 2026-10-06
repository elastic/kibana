/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import type { JsonSchema } from '@kbn/workflows';
import {
  MAX_SUMMARY_BULLETS_CHARS,
  MAX_SUMMARY_PROPOSAL_BULLETS,
} from '../../../../../common/step_types/package_report';
import type { PackageReportMintPayload } from '../../../../../common/step_types/package_report';
import {
  buildProposalComment,
  buildProposalTitle,
  buildRecommendationComment,
} from './proposal_copy';
import type {
  CurrentRunHost,
  CurrentRunState,
  DecidePackageReportResult,
  ProcessSelector,
} from './types';

/**
 * Fixed namespace for Same-Investigation Proposal subject keys. Frozen: changing
 * it renames every subject and breaks idempotent mint.
 */
const HUNT_PROPOSAL_SUBJECT_UUID_NAMESPACE = 'a3c7e91f-4b2d-5e68-9c1a-8f0d6b3e5a72';

export const buildProposalSubjectKey = ({
  conversationId,
  endpointId,
  actionWorkflowId,
  processKey,
}: {
  conversationId: string;
  endpointId: string;
  actionWorkflowId: string;
  processKey?: string;
}): string => {
  const material = processKey
    ? `${conversationId}|${endpointId}|${actionWorkflowId}|${processKey}`
    : `${conversationId}|${endpointId}|${actionWorkflowId}`;
  return uuidv5(material, HUNT_PROPOSAL_SUBJECT_UUID_NAMESPACE);
};

/** One per run: a rerun of the same report must settle onto the same recommendation, not mint a second one. */
const buildRecommendationSubjectKey = (conversationId: string): string =>
  uuidv5(`${conversationId}|recommendation`, HUNT_PROPOSAL_SUBJECT_UUID_NAMESPACE);

const schemaRequires = (schema: JsonSchema | undefined, key: string): boolean => {
  if (!schema || typeof schema !== 'object') {
    return false;
  }
  const required = (schema as { required?: unknown }).required;
  return Array.isArray(required) && required.includes(key);
};

const schemaHasProperty = (schema: JsonSchema | undefined, key: string): boolean => {
  if (!schema || typeof schema !== 'object') {
    return false;
  }
  const properties = (schema as { properties?: Record<string, unknown> }).properties;
  return properties !== undefined && key in properties;
};

const actionInputSchema = (entry: ActionCatalogEntry): JsonSchema | undefined => {
  const schema = entry.inputSchema;
  if (!schema || typeof schema !== 'object') {
    return undefined;
  }
  const nested = (schema as { properties?: Record<string, JsonSchema> }).properties?.actionInput;
  // Catalog entries publish the manual-trigger inputs object; some wrap under actionInput.
  if (nested && schemaHasProperty(schema, 'actionInput')) {
    return nested;
  }
  return schema;
};

const needsProcessParameters = (schema: JsonSchema | undefined): boolean =>
  !!schema && (schemaRequires(schema, 'parameters') || schemaHasProperty(schema, 'parameters'));

/** Every field name `buildActionInput` below actually knows how to supply. */
const FILLABLE_FIELDS = new Set(['endpoint_ids', 'parameters']);

const requiredFields = (schema: JsonSchema | undefined): string[] => {
  if (!schema || typeof schema !== 'object') {
    return [];
  }
  const required = (schema as { required?: unknown }).required;
  return Array.isArray(required)
    ? required.filter((field): field is string => typeof field === 'string')
    : [];
};

/**
 * True when the catalog entry's inputSchema can be fully filled from the given
 * host + optional process selector. Entries without inputSchema are unfillable.
 *
 * Checks the schema's `required` list as a whole, not only `endpoint_ids`/`parameters` in
 * isolation: `buildActionInput` below only ever supplies those two fields, so a schema
 * requiring anything else can never be filled regardless of host/process data, and offering
 * it as executable would mint a proposal that fails after an analyst has already approved it.
 * This also means a catalog action gaining a new required field in the future falls back to a
 * recommendation automatically, rather than silently minting an unfillable proposal.
 *
 * A process-scoped action requires `processSelector.entityId` specifically, not a bare
 * `pid`: PIDs are reused by the OS, and between minting and an analyst's approval (the
 * gate's decision window is measured in days) a bare PID can come to belong to an
 * unrelated process. `entity_id` is Endpoint's durable per-process identity and doesn't
 * have that failure mode. A selector with only a `pid` still surfaces for the
 * recommendation path (see `decidePackageReport`'s `processUncovered`) — it just can't
 * back an executable kill/suspend.
 */
export const canFillRespondAction = ({
  entry,
  processSelector,
}: {
  entry: ActionCatalogEntry;
  processSelector?: ProcessSelector;
}): boolean => {
  if (entry.category === 'configure') {
    return false;
  }
  const schema = actionInputSchema(entry);
  if (!schema) {
    return false;
  }
  if (!requiredFields(schema).every((field) => FILLABLE_FIELDS.has(field))) {
    return false;
  }
  if (needsProcessParameters(schema)) {
    return processSelector?.entityId !== undefined;
  }
  return true;
};

export const buildActionInput = ({
  entry,
  agentId,
  processSelector,
}: {
  entry: ActionCatalogEntry;
  agentId: string;
  processSelector?: ProcessSelector;
}): Record<string, unknown> | undefined => {
  if (!canFillRespondAction({ entry, processSelector })) {
    return undefined;
  }
  const schema = actionInputSchema(entry);
  const actionInput: Record<string, unknown> = {
    endpoint_ids: [agentId],
  };
  if (needsProcessParameters(schema)) {
    // `canFillRespondAction` above already guarantees `processSelector.entityId` is set.
    actionInput.parameters = { entity_id: processSelector!.entityId };
  }
  return actionInput;
};

const MAX_SUMMARY_HOST_NAME_CHARS = 253;

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

/**
 * Bounded bullet list for the run conclusion. `proposals` stays whole (it drives the gate
 * fan-out); only this prose view is capped, and everything left out is reported as a count.
 */
export const buildProposalSummaryBullets = (
  proposals: PackageReportMintPayload[]
): { bullets: string[]; omittedCount: number } => {
  const bullets: string[] = [];
  let usedChars = 0;
  for (const p of proposals.slice(0, MAX_SUMMARY_PROPOSAL_BULLETS)) {
    const host = p.hostName ? ` on \`${truncate(p.hostName, MAX_SUMMARY_HOST_NAME_CHARS)}\`` : '';
    const action = p.actionWorkflowId
      ? `: runs \`${p.actionWorkflowId}\` on approval`
      : ': recommendation only';
    const bullet = `- **${p.title || p.category}**${host}${action}`;
    // +1 for the newline between bullets.
    if (usedChars + bullet.length + 1 > MAX_SUMMARY_BULLETS_CHARS) {
      break;
    }
    bullets.push(bullet);
    usedChars += bullet.length + 1;
  }
  return { bullets, omittedCount: proposals.length - bullets.length };
};

const buildClosureSummary = (state: CurrentRunState): string => {
  const title = state.titles[0] ?? `Hunt run ${state.runId}`;
  const evidence =
    state.evidenceLines.length > 0
      ? ` Evidence: ${state.evidenceLines.slice(0, 5).join('; ')}.`
      : '';
  if (!state.hasConfirmedHit) {
    return `${title}. No confirmed hits.${evidence}`;
  }
  const hostPart =
    state.hosts.length > 0
      ? ` Hosts: ${state.hosts.map((h) => h.name).join(', ')}.`
      : ' No eligible hosts.';
  return `${title}. Confirmed hit.${hostPart}${evidence}`;
};

/** Why the recommendation fired, one line per reason that actually held. */
const buildRecommendationReasonLines = ({
  hasExecutable,
  unenrolledHosts,
  nonHostEvidence,
  evidenceOutsideActionable,
  processUncovered,
}: {
  hasExecutable: boolean;
  unenrolledHosts: CurrentRunHost[];
  nonHostEvidence: boolean;
  evidenceOutsideActionable: boolean;
  processUncovered: boolean;
}): string[] => {
  const lines: string[] = [];
  if (!hasExecutable) {
    lines.push('No respond action could be filled for this finding.');
  }
  if (unenrolledHosts.length > 0) {
    lines.push(
      `${unenrolledHosts.length === 1 ? 'Host' : 'Hosts'} ${unenrolledHosts
        .map((h) => h.name)
        .join(', ')} ${
        unenrolledHosts.length === 1 ? 'is' : 'are'
      } not enrolled, so no Defend action reaches ${unenrolledHosts.length === 1 ? 'it' : 'them'}.`
    );
  }
  if (nonHostEvidence) {
    lines.push(
      'Part of the evidence for this finding is not host-scoped, so a host action would not close it.'
    );
  }
  // Says what was observed -- an event whose index is not among the run's `actionable_indices` --
  // rather than concluding the finding is not host-scoped. An empty actionable set also means
  // the mapping classifier was degraded, and the run cannot tell that apart from a customer
  // with no process telemetry; neither reading would justify the stronger claim.
  if (evidenceOutsideActionable) {
    lines.push(
      'Some evidence came from indices not known to carry a process identity to act on, so a host action would not close it on its own.'
    );
  }
  if (processUncovered) {
    lines.push('A process was implicated but could not be resolved to a live process to act on.');
  }
  return lines;
};

const buildRecommendationProposal = ({
  conversationId,
  state,
  reasonLines,
}: {
  conversationId: string;
  state: CurrentRunState;
  reasonLines: string[];
}): PackageReportMintPayload => ({
  subjectKey: buildRecommendationSubjectKey(conversationId),
  conversationId,
  // Fixed, not per-host/per-action like buildProposalTitle below: this Proposal isn't scoped
  // to one host or action, so there's no single subject to name in a dynamic title.
  title: 'Analyst recommendation',
  comment: buildRecommendationComment({
    reasonLines,
    manualRemediation: state.manualRemediation,
    state,
  }),
  // TODO: give this its own queue category once the UI has a place to show it separately
  // from executable proposals; a stored keyword move, not a schema change.
  category: 'respond',
  confidence: 'medium',
});

/**
 * Respond-action fan-out plus the analyst-recommendation mint rule. Pure: no I/O.
 */
export const decidePackageReport = ({
  conversationId,
  state,
  catalog,
}: {
  conversationId: string;
  state: CurrentRunState;
  catalog: { ok: true; actions: ActionCatalogEntry[] } | { ok: false; reason: 'catalog_error' };
}): DecidePackageReportResult => {
  const closureSummary = buildClosureSummary(state);

  if (!state.hasConfirmedHit) {
    return { dismiss: true, proposals: [], closureSummary };
  }

  const eligible = state.hosts.filter((h) => h.enrolled && h.agentId);
  const unenrolled = state.hosts.filter((h) => !h.enrolled || !h.agentId);
  const respondActions = catalog.ok ? catalog.actions.filter((a) => a.category === 'respond') : [];

  const proposals: PackageReportMintPayload[] = [];
  const seenSubjectKeys = new Set<string>();

  if (catalog.ok && respondActions.length > 0 && eligible.length > 0) {
    for (const host of eligible) {
      const agentId = host.agentId!;
      // A selector's `hostName` names the host it was actually observed on; applying it to
      // every enrolled host would mint a kill-process proposal against the wrong agent.
      const hostProcessSelectors = state.processSelectors.filter(
        (selector) => selector.hostName === host.name
      );
      for (const entry of respondActions) {
        const schema = actionInputSchema(entry);
        const processScoped = needsProcessParameters(schema);

        if (processScoped) {
          for (const processSelector of hostProcessSelectors) {
            const actionInput = buildActionInput({ entry, agentId, processSelector });
            if (!actionInput) {
              continue;
            }
            const subjectKey = buildProposalSubjectKey({
              conversationId,
              endpointId: agentId,
              actionWorkflowId: entry.workflowId,
              processKey: processSelector.processKey,
            });
            if (seenSubjectKeys.has(subjectKey)) {
              continue;
            }
            seenSubjectKeys.add(subjectKey);
            proposals.push({
              subjectKey,
              conversationId,
              // Per-process title so two process-scoped proposals on the same host (e.g.
              // kill-process for two different pids) read as distinct, not duplicates.
              title: buildProposalTitle({ entry, host, processSelector }),
              comment: buildProposalComment({ entry, host, state, processSelector }),
              category: entry.category ?? 'respond',
              impact: entry.impact,
              actionWorkflowId: entry.workflowId,
              actionInput,
              hostName: host.name,
            });
          }
          continue;
        }

        const actionInput = buildActionInput({ entry, agentId });
        if (!actionInput) {
          continue;
        }
        const subjectKey = buildProposalSubjectKey({
          conversationId,
          endpointId: agentId,
          actionWorkflowId: entry.workflowId,
        });
        if (seenSubjectKeys.has(subjectKey)) {
          continue;
        }
        seenSubjectKeys.add(subjectKey);
        proposals.push({
          subjectKey,
          conversationId,
          title: buildProposalTitle({ entry, host }),
          comment: buildProposalComment({ entry, host, state }),
          category: entry.category ?? 'respond',
          impact: entry.impact,
          actionWorkflowId: entry.workflowId,
          actionInput,
          hostName: host.name,
        });
      }
    }
  }

  const hasExecutable = proposals.length > 0;
  const notHostScoped =
    state.hasNonHostEntity || state.hasIocIndicator || !state.allEventsActionable;
  // Covers both "no process selector was found at all" and "a selector was found but only
  // as a bare pid" (no `entityId`): `canFillRespondAction` above refuses to back an
  // executable action with a bare pid, since PID reuse can point it at the wrong process by
  // the time an analyst approves it, so both shapes land here as process evidence that could
  // not back an action. Only worth flagging once something else did mint for a host with
  // process evidence; "nothing minted at all" is already covered by `!hasExecutable` above.
  const hasDurableProcessIdentity = state.processSelectors.some((s) => s.entityId !== undefined);
  const processUncovered =
    hasExecutable &&
    state.hasProcessBearingEvent &&
    !hasDurableProcessIdentity &&
    !proposals.some((p) => p.actionInput?.parameters !== undefined);
  const needsRecommendation =
    !hasExecutable || unenrolled.length > 0 || notHostScoped || processUncovered;

  if (needsRecommendation) {
    const reasonLines = buildRecommendationReasonLines({
      hasExecutable,
      unenrolledHosts: unenrolled,
      nonHostEvidence: state.hasNonHostEntity || state.hasIocIndicator,
      evidenceOutsideActionable: !state.allEventsActionable,
      processUncovered,
    });
    proposals.push(buildRecommendationProposal({ conversationId, state, reasonLines }));
  }

  return { dismiss: false, proposals, closureSummary };
};
