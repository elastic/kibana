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

const buildActionlessSubjectKey = ({
  conversationId,
  reason,
}: {
  conversationId: string;
  reason: string;
}): string =>
  uuidv5(`${conversationId}|actionless|${reason}`, HUNT_PROPOSAL_SUBJECT_UUID_NAMESPACE);

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

/** Every fillable respond action today is an Elastic Defend action; naming that plainly in the
 *  headline is what tells an executable proposal apart from the "Recommend" companion below. */
const DEFEND_HEADLINE_PREFIX = 'Defend';
const RECOMMEND_HEADLINE_PREFIX = 'Recommend';

const titleCase = (value: string): string => value.replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * One line naming what the proposal actually does, followed by the evidence. Per host and per
 * action so two proposals on the same run never read as duplicates of each other.
 */
const buildHostActionComment = (
  state: CurrentRunState,
  host: CurrentRunHost,
  actionName: string
): string => {
  const headline = `${DEFEND_HEADLINE_PREFIX} ${titleCase(actionName)}: ${host.name}`;
  const title = state.titles[0] ?? `Hunt run ${state.runId}`;
  const evidence =
    state.evidenceLines.length > 0
      ? ` Evidence: ${state.evidenceLines.slice(0, 5).join('; ')}.`
      : '';
  return `${headline}\n\n${title}. Confirmed hit. Host: ${host.name}.${evidence}`;
};

const actionlessHeadline = ({
  reason,
  unenrolledHosts,
}: {
  reason: NonNullable<PackageReportMintPayload['actionlessReason']>;
  unenrolledHosts: CurrentRunHost[];
}): string => {
  switch (reason) {
    case 'unenrolled':
      return unenrolledHosts.length > 0
        ? `${RECOMMEND_HEADLINE_PREFIX}: Unenrolled host${
            unenrolledHosts.length === 1 ? '' : 's'
          } need${unenrolledHosts.length === 1 ? 's' : ''} isolation: ${unenrolledHosts
            .map((h) => h.name)
            .join(', ')}`
        : `${RECOMMEND_HEADLINE_PREFIX}: Unenrolled host needs isolation`;
    case 'hostless':
      return `${RECOMMEND_HEADLINE_PREFIX}: No host entity to act on`;
    case 'catalog_error':
      return `${RECOMMEND_HEADLINE_PREFIX}: Response action catalog unavailable`;
    case 'catalog_empty':
      return `${RECOMMEND_HEADLINE_PREFIX}: No response actions installed`;
    case 'no_fillable_action':
      return `${RECOMMEND_HEADLINE_PREFIX}: No fillable response action`;
  }
};

const actionlessComment = ({
  state,
  reason,
  unenrolledHosts,
}: {
  state: CurrentRunState;
  reason: NonNullable<PackageReportMintPayload['actionlessReason']>;
  unenrolledHosts: CurrentRunHost[];
}): string => {
  const headline = actionlessHeadline({ reason, unenrolledHosts });
  const base = buildClosureSummary(state);
  return `${headline}\n\n${base}`;
};

const actionlessProposal = ({
  conversationId,
  state,
  reason,
  unenrolledHosts,
}: {
  conversationId: string;
  state: CurrentRunState;
  reason: NonNullable<PackageReportMintPayload['actionlessReason']>;
  unenrolledHosts: CurrentRunHost[];
}): PackageReportMintPayload => ({
  subjectKey: buildActionlessSubjectKey({ conversationId, reason }),
  conversationId,
  comment: actionlessComment({ state, reason, unenrolledHosts }),
  category: 'respond',
  actionlessReason: reason,
});

/**
 * Section D decision table + respond-action fan-out. Pure: no I/O.
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

  if (!catalog.ok) {
    return {
      dismiss: false,
      closureSummary,
      proposals: [
        actionlessProposal({
          conversationId,
          state,
          reason: 'catalog_error',
          unenrolledHosts: unenrolled,
        }),
      ],
    };
  }

  const respondActions = catalog.actions.filter((a) => a.category === 'respond');

  if (respondActions.length === 0) {
    return {
      dismiss: false,
      closureSummary,
      proposals: [
        actionlessProposal({
          conversationId,
          state,
          reason: 'catalog_empty',
          unenrolledHosts: unenrolled,
        }),
      ],
    };
  }

  if (eligible.length === 0) {
    const reason = state.hosts.length === 0 ? 'hostless' : 'unenrolled';
    return {
      dismiss: false,
      closureSummary,
      proposals: [
        actionlessProposal({ conversationId, state, reason, unenrolledHosts: unenrolled }),
      ],
    };
  }

  const proposals: PackageReportMintPayload[] = [];
  const seenSubjectKeys = new Set<string>();

  for (const host of eligible) {
    const agentId = host.agentId!;
    for (const entry of respondActions) {
      const hostClosureSummary = buildHostActionComment(state, host, entry.name);
      const schema = actionInputSchema(entry);
      const processScoped = needsProcessParameters(schema);

      if (processScoped) {
        for (const processSelector of state.processSelectors) {
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
            comment: hostClosureSummary,
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
        comment: hostClosureSummary,
        category: entry.category ?? 'respond',
        impact: entry.impact,
        actionWorkflowId: entry.workflowId,
        actionInput,
        hostName: host.name,
      });
    }
  }

  const executable = proposals.filter((p) => p.actionWorkflowId);

  if (executable.length === 0) {
    return {
      dismiss: false,
      closureSummary,
      proposals: [
        actionlessProposal({
          conversationId,
          state,
          reason: 'no_fillable_action',
          unenrolledHosts: unenrolled,
        }),
      ],
    };
  }

  // Unenrolled hosts are named on a companion actionless recommendation.
  if (unenrolled.length > 0) {
    const companion = actionlessProposal({
      conversationId,
      state,
      reason: 'unenrolled',
      unenrolledHosts: unenrolled,
    });
    if (!seenSubjectKeys.has(companion.subjectKey)) {
      proposals.push(companion);
    }
  }

  return { dismiss: false, proposals, closureSummary };
};
