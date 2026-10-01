/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import type { ActionCatalogEntry, ActionSubjectKind } from '@kbn/alertzero-common';
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
import {
  DEFEND_ACTION_KINDS,
  selectHostActions,
  selectProcessActions,
  type ProcessActionKind,
} from './select_process_actions';
import type {
  CurrentRunHost,
  CurrentRunState,
  DecidePackageReportResult,
  Subject,
  SubjectKind,
} from './types';

/** Catalog categories packaging may mint from. `configure` entries are never fillable. */
const PACKAGEABLE_CATEGORIES = ['respond', 'investigate'];

/**
 * Fixed namespace for Same-Investigation Proposal subject keys. Frozen: changing
 * it renames every subject and breaks idempotent mint.
 */
const HUNT_PROPOSAL_SUBJECT_UUID_NAMESPACE = 'a3c7e91f-4b2d-5e68-9c1a-8f0d6b3e5a72';

/**
 * `subjectId` is the agent id for host and process subjects (the material is unchanged
 * from when this slot was called `endpointId`) and `<kind>:<value>` for identities, which
 * cannot collide with an agent id.
 */
export const buildProposalSubjectKey = ({
  conversationId,
  subjectId,
  actionWorkflowId,
  processKey,
}: {
  conversationId: string;
  subjectId: string;
  actionWorkflowId: string;
  processKey?: string;
}): string => {
  const material = processKey
    ? `${conversationId}|${subjectId}|${actionWorkflowId}|${processKey}`
    : `${conversationId}|${subjectId}|${actionWorkflowId}`;
  return uuidv5(material, HUNT_PROPOSAL_SUBJECT_UUID_NAMESPACE);
};

/**
 * Every subject packaging could act on, in a stable order: each host, then its processes,
 * then users, then services. Unreachable hosts stay in the list; callers filter.
 */
export const collectSubjects = (state: CurrentRunState): Subject[] => {
  const subjects: Subject[] = [];
  for (const host of state.hosts) {
    const reachable = host.enrolled && host.agentId !== undefined;
    subjects.push({ kind: 'host', value: host.name, reachable, host });
    // A selector's `hostName` names the host it was actually observed on; applying it to
    // every enrolled host would mint a kill-process proposal against the wrong agent.
    for (const processSelector of state.processSelectors) {
      if (processSelector.hostName === host.name) {
        subjects.push({
          kind: 'process',
          value: processSelector.processName,
          reachable,
          host,
          processSelector,
        });
      }
    }
  }
  for (const user of state.users) {
    subjects.push({ kind: 'user', value: user, reachable: true });
  }
  for (const service of state.services) {
    subjects.push({ kind: 'service', value: service, reachable: true });
  }
  return subjects;
};

/** Stable id for the key material's second slot; undefined for a host with no agent id. */
const subjectId = (subject: Subject): string | undefined => {
  switch (subject.kind) {
    case 'host':
    case 'process':
      return subject.host.agentId;
    case 'user':
    case 'service':
      return `${subject.kind}:${subject.value}`;
  }
};

/**
 * Input keys each subject kind can supply. An action whose `required` keys fall outside its
 * declared kind's set is a YAML mistake and is never fillable.
 */
const SUPPLIED_KEYS: Record<SubjectKind, readonly string[]> = {
  host: ['endpoint_ids'],
  process: ['endpoint_ids', 'parameters'],
  user: ['id_field', 'id_value', 'criticality_level'],
  service: ['id_field', 'id_value', 'criticality_level'],
};

/** One per run: a rerun of the same report must settle onto the same recommendation, not mint a second one. */
const buildRecommendationSubjectKey = (conversationId: string): string =>
  uuidv5(`${conversationId}|recommendation`, HUNT_PROPOSAL_SUBJECT_UUID_NAMESPACE);

const schemaRequiredKeys = (schema: JsonSchema | undefined): string[] => {
  if (!schema || typeof schema !== 'object') {
    return [];
  }
  const required = (schema as { required?: unknown }).required;
  return Array.isArray(required) ? required.filter((key) => typeof key === 'string') : [];
};

const schemaRequires = (schema: JsonSchema | undefined, key: string): boolean =>
  schemaRequiredKeys(schema).includes(key);

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
 * Kinds the action acts on. An entry installed from a definition that predates
 * `actionMetadata.subject` carries no `subjects`; it is inferred process when its schema
 * has `parameters`, else host, which is exactly the pre-subject rule.
 */
const actionSubjectKinds = (entry: ActionCatalogEntry): ActionSubjectKind[] =>
  entry.subjects ?? [needsProcessParameters(actionInputSchema(entry)) ? 'process' : 'host'];

/**
 * True when the catalog entry acts on the subject's kind and every `required` key of its
 * `actionInput` schema is one that kind can supply. Entries without inputSchema are unfillable.
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
  subject,
}: {
  entry: ActionCatalogEntry;
  subject: Subject;
}): boolean => {
  if (entry.category === 'configure') {
    return false;
  }
  const schema = actionInputSchema(entry);
  if (!schema) {
    return false;
  }
  if (!actionSubjectKinds(entry).includes(subject.kind)) {
    return false;
  }
  const supplied = SUPPLIED_KEYS[subject.kind];
  if (!schemaRequiredKeys(schema).every((key) => supplied.includes(key))) {
    return false;
  }
  if (subject.kind === 'host' || subject.kind === 'process') {
    if (!schemaHasProperty(schema, 'endpoint_ids')) {
      return false;
    }
  }
  if (subject.kind === 'process') {
    return subject.processSelector.entityId !== undefined;
  }
  if (subject.kind === 'user' || subject.kind === 'service') {
    // Asset Criticality's Elasticsearch document _id is `${id_field}:${id_value}` verbatim
    // (AssetCriticalityDataClient.createId), and Elasticsearch rejects an _id over 512 UTF-8
    // bytes. `subject.value` is allowed up to 2048 *characters* (matching the SSE entity cap),
    // so an overlong identity must fall back to the recommendation rather than mint an action
    // that fails its write after an analyst has already approved it.
    return Buffer.byteLength(`${subject.kind}.name:${subject.value}`, 'utf8') <= 512;
  }
  return true;
};

/** Writes only the keys the schema declares, filled from the subject by kind. */
export const buildActionInput = ({
  entry,
  subject,
  state,
}: {
  entry: ActionCatalogEntry;
  subject: Subject;
  state: CurrentRunState;
}): Record<string, unknown> | undefined => {
  if (!canFillRespondAction({ entry, subject })) {
    return undefined;
  }
  const schema = actionInputSchema(entry);
  switch (subject.kind) {
    case 'host':
    case 'process': {
      const agentId = subject.host.agentId;
      if (agentId === undefined) {
        return undefined;
      }
      const actionInput: Record<string, unknown> = { endpoint_ids: [agentId] };
      if (subject.kind === 'process' && needsProcessParameters(schema)) {
        // `canFillRespondAction` above already guarantees `processSelector.entityId` is set.
        // Memory dump's request schema also takes `type`; only process dumps are proposed.
        const scope =
          DEFEND_ACTION_KINDS[entry.workflowId] === 'memory_dump' ? { type: 'process' } : {};
        actionInput.parameters = { ...scope, entity_id: subject.processSelector.entityId };
      }
      return actionInput;
    }
    case 'user':
    case 'service': {
      const actionInput: Record<string, unknown> = {
        id_field: `${subject.kind}.name`,
        id_value: subject.value,
      };
      if (schemaHasProperty(schema, 'criticality_level')) {
        // A confirmed finding marks the identity high impact; a critical one goes one higher.
        actionInput.criticality_level =
          state.severity === 'critical' ? 'extreme_impact' : 'high_impact';
      }
      return actionInput;
    }
  }
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
    const host = p.hostName
      ? ` on \`${truncate(p.hostName, MAX_SUMMARY_HOST_NAME_CHARS)}\``
      : p.subject
      ? ` for ${p.subject.kind} \`${truncate(p.subject.value, MAX_SUMMARY_HOST_NAME_CHARS)}\``
      : '';
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
  const userPart = state.users.length > 0 ? ` Users: ${state.users.join(', ')}.` : '';
  const servicePart = state.services.length > 0 ? ` Services: ${state.services.join(', ')}.` : '';
  return `${title}. Confirmed hit.${hostPart}${userPart}${servicePart}${evidence}`;
};

/** e.g. `dev-user (user) and escalated-role (service)`; users first, then services. */
const describeIdentities = ({ users, services }: { users: string[]; services: string[] }): string =>
  [...users.map((u) => `${u} (user)`), ...services.map((s) => `${s} (service)`)].join(' and ');

/** Why the recommendation fired, one line per reason that actually held. */
const buildRecommendationReasonLines = ({
  hasExecutable,
  unenrolledHosts,
  users,
  services,
  proposedIdentityIds,
  hasIocIndicator,
  hasUnnamedIdentityEntity,
  evidenceOutsideActionable,
  processUncovered,
  hasHeldBack,
}: {
  hasExecutable: boolean;
  unenrolledHosts: CurrentRunHost[];
  users: string[];
  services: string[];
  /** `<kind>:<value>` of every identity that got an executable proposal this run. */
  proposedIdentityIds: Set<string>;
  hasIocIndicator: boolean;
  /** An identity named by a field (`user.email`, `user.id`, `service.id`) this run can't act on. */
  hasUnnamedIdentityEntity: boolean;
  evidenceOutsideActionable: boolean;
  processUncovered: boolean;
  hasHeldBack: boolean;
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
  const isProposed = (kind: 'user' | 'service') => (value: string) =>
    proposedIdentityIds.has(`${kind}:${value}`);
  const proposed = {
    users: users.filter(isProposed('user')),
    services: services.filter(isProposed('service')),
  };
  const unreached = {
    users: users.filter((u) => !isProposed('user')(u)),
    services: services.filter((s) => !isProposed('service')(s)),
  };
  const proposedCount = proposed.users.length + proposed.services.length;
  if (proposedCount > 0) {
    lines.push(
      `Asset criticality is proposed for ${describeIdentities(proposed)}; revoking ${
        proposedCount === 1 ? 'its' : 'their'
      } credentials is manual until an identity provider action exists.`
    );
  }
  const unreachedCount = unreached.users.length + unreached.services.length;
  if (unreachedCount > 0) {
    lines.push(
      `${unreachedCount === 1 ? 'Identity' : 'Identities'} ${describeIdentities(unreached)} ${
        unreachedCount === 1 ? 'is' : 'are'
      } implicated; a host action does not reach ${unreachedCount === 1 ? 'it' : 'them'}.`
    );
  }
  if (hasIocIndicator || hasUnnamedIdentityEntity) {
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
  if (hasHeldBack) {
    lines.push('Not every Defend action was proposed for this finding; see Held back.');
  }
  return lines;
};

const buildRecommendationProposal = ({
  conversationId,
  state,
  reasonLines,
  heldBackLines,
}: {
  conversationId: string;
  state: CurrentRunState;
  reasonLines: string[];
  heldBackLines: string[];
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
    heldBackLines,
  }),
  // TODO: give this its own queue category once the UI has a place to show it separately
  // from executable proposals; a stored keyword move, not a schema change.
  category: 'respond',
  confidence: 'medium',
});

/**
 * Per-host Defend action selection (one primary response per process, conditional isolate),
 * generic fan-out for any other fillable action, plus the analyst-recommendation mint rule.
 * Pure: no I/O.
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

  const unenrolled = state.hosts.filter((h) => !h.enrolled || !h.agentId);
  const actions = catalog.ok
    ? catalog.actions.filter((a) => a.category && PACKAGEABLE_CATEGORIES.includes(a.category))
    : [];
  // The selection table governs the Defend actions it names; any other fillable entry keeps
  // the generic fan-out so a future action is not silently dropped.
  const known = new Map<ProcessActionKind | 'isolate', ActionCatalogEntry>();
  const other: ActionCatalogEntry[] = [];
  for (const entry of actions) {
    const kind = DEFEND_ACTION_KINDS[entry.workflowId];
    if (kind) {
      known.set(kind, entry);
    } else {
      other.push(entry);
    }
  }

  const proposals: PackageReportMintPayload[] = [];
  const seenSubjectKeys = new Set<string>();
  const heldBackLines: string[] = [];

  const mint = ({
    entry,
    subject,
    ruleLine,
  }: {
    entry: ActionCatalogEntry;
    subject: Subject;
    ruleLine?: string;
  }): void => {
    const id = subjectId(subject);
    const actionInput = buildActionInput({ entry, subject, state });
    if (id === undefined || !actionInput) {
      return;
    }
    const subjectKey = buildProposalSubjectKey({
      conversationId,
      subjectId: id,
      actionWorkflowId: entry.workflowId,
      ...(subject.kind === 'process' && { processKey: subject.processSelector.processKey }),
    });
    if (seenSubjectKeys.has(subjectKey)) {
      return;
    }
    seenSubjectKeys.add(subjectKey);
    proposals.push({
      subjectKey,
      conversationId,
      // Per-subject title so two process-scoped proposals on the same host (e.g.
      // suspend for two different pids) read as distinct, not duplicates.
      title: buildProposalTitle({ entry, subject, actionInput }),
      comment: buildProposalComment({ entry, subject, state, actionInput, ruleLine }),
      category: entry.category ?? 'respond',
      impact: entry.impact,
      actionWorkflowId: entry.workflowId,
      actionInput,
      // `hostName` stays populated for host and process mints; identity mints carry only `subject`.
      ...((subject.kind === 'host' || subject.kind === 'process') && {
        hostName: subject.host.name,
      }),
      subject: { kind: subject.kind, value: subject.value },
    });
  };

  // A held-back line only makes sense for an action the catalog could have offered.
  const processKinds: ProcessActionKind[] = ['kill', 'suspend', 'memory_dump'];
  const hasProcessKinds = processKinds.some((kind) => known.has(kind));
  const isolate = known.get('isolate');

  if (catalog.ok && actions.length > 0) {
    const reachable = collectSubjects(state).filter((s) => s.reachable);

    // Defend actions the selection table governs apply to enrolled hosts and their processes.
    for (const host of state.hosts.filter((h) => h.enrolled && h.agentId)) {
      const hostProcessSelectors = state.processSelectors.filter(
        (selector) => selector.hostName === host.name
      );

      let activeProcessCount = 0;
      for (const processSelector of hostProcessSelectors) {
        const decision = selectProcessActions({ selector: processSelector, host, state });
        if (decision.rule !== 'stale') {
          activeProcessCount += 1;
        }
        if (!hasProcessKinds) {
          continue;
        }
        if (decision.heldBack) {
          heldBackLines.push(decision.heldBack);
        }
        const subject: Subject = {
          kind: 'process',
          value: processSelector.processName,
          reachable: true,
          host,
          processSelector,
        };
        for (const kind of decision.actions) {
          // A kind the catalog does not have (e.g. memory dump not installed) is skipped; the
          // rest of the decision still mints.
          const entry = known.get(kind);
          if (entry) {
            mint({ entry, subject, ruleLine: decision.why });
          }
        }
      }

      if (isolate) {
        const hostDecision = selectHostActions({ host, state, activeProcessCount });
        if (hostDecision.isolate) {
          mint({
            entry: isolate,
            subject: { kind: 'host', value: host.name, reachable: true, host },
            ruleLine: hostDecision.why,
          });
        } else if (hostDecision.heldBack) {
          heldBackLines.push(hostDecision.heldBack);
        }
      }
    }

    // Any other fillable action (identity actions included) keeps the generic fan-out over
    // every reachable subject its declared kinds accept.
    for (const subject of reachable) {
      for (const entry of other) {
        mint({ entry, subject });
      }
    }
  }

  const hasExecutable = proposals.length > 0;
  const hasIdentity = state.users.length > 0 || state.services.length > 0;
  const evidenceOutsideActionable = !state.allEventsActionable;
  const notHostScoped =
    hasIdentity ||
    state.hasIocIndicator ||
    state.hasUnnamedIdentityEntity ||
    evidenceOutsideActionable;
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
    !hasExecutable ||
    unenrolled.length > 0 ||
    notHostScoped ||
    processUncovered ||
    heldBackLines.length > 0;

  if (needsRecommendation) {
    const reasonLines = buildRecommendationReasonLines({
      hasExecutable,
      unenrolledHosts: unenrolled,
      users: state.users,
      services: state.services,
      proposedIdentityIds: new Set(
        proposals.flatMap(({ subject }) =>
          subject && (subject.kind === 'user' || subject.kind === 'service')
            ? [`${subject.kind}:${subject.value}`]
            : []
        )
      ),
      hasIocIndicator: state.hasIocIndicator,
      hasUnnamedIdentityEntity: state.hasUnnamedIdentityEntity,
      evidenceOutsideActionable,
      processUncovered,
      hasHeldBack: heldBackLines.length > 0,
    });
    proposals.push(
      buildRecommendationProposal({ conversationId, state, reasonLines, heldBackLines })
    );
  }

  return { dismiss: false, proposals, closureSummary };
};
