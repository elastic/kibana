/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import type { JsonSchema } from '@kbn/workflows';
import type { PackageReportMintPayload } from '../../../common/step_types/package_report';
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

/**
 * True when the catalog entry's inputSchema can be fully filled from the given
 * host + optional process selector. Entries without inputSchema are unfillable.
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
  if (needsProcessParameters(schema)) {
    if (!processSelector) {
      return false;
    }
    return processSelector.pid !== undefined || processSelector.entityId !== undefined;
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
    if (!processSelector) {
      return undefined;
    }
    if (processSelector.entityId !== undefined) {
      actionInput.parameters = { entity_id: processSelector.entityId };
    } else if (processSelector.pid !== undefined) {
      actionInput.parameters = { pid: processSelector.pid };
    } else {
      return undefined;
    }
  }
  return actionInput;
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
  notHostScoped,
  processUncovered,
}: {
  hasExecutable: boolean;
  unenrolledHosts: CurrentRunHost[];
  notHostScoped: boolean;
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
  if (notHostScoped) {
    lines.push(
      'Part of the evidence for this finding is not host-scoped, so a host action would not close it.'
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
  // Only worth flagging once something else did mint for a host with process evidence;
  // "nothing minted at all" is already covered by `!hasExecutable` above.
  const processUncovered =
    hasExecutable &&
    state.hasProcessBearingEvent &&
    state.processSelectors.length === 0 &&
    !proposals.some((p) => p.actionInput?.parameters !== undefined);
  const needsRecommendation =
    !hasExecutable || unenrolled.length > 0 || notHostScoped || processUncovered;

  if (needsRecommendation) {
    const reasonLines = buildRecommendationReasonLines({
      hasExecutable,
      unenrolledHosts: unenrolled,
      notHostScoped,
      processUncovered,
    });
    proposals.push(buildRecommendationProposal({ conversationId, state, reasonLines }));
  }

  return { dismiss: false, proposals, closureSummary };
};
