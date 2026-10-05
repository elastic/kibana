/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { v5 as uuidv5 } from 'uuid';
import { ALERTZERO_ACTION_HANDOFF_TO_FORENSICS_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  HUNT_COVERAGE_AI_INDEX_ID,
  type PackageReportMintPayload,
} from '../../../../../common/step_types/package_report';
import {
  buildHandoffComment,
  buildHandoffContext,
  buildHandoffTitle,
  buildRecommendationComment,
} from './proposal_copy';
import type { CurrentRunHost, CurrentRunState, DecidePackageReportResult } from './types';

/**
 * Fixed namespace for Same-Investigation Proposal subject keys. Frozen: changing
 * it renames every subject and breaks idempotent mint.
 */
const HUNT_PROPOSAL_SUBJECT_UUID_NAMESPACE = 'a3c7e91f-4b2d-5e68-9c1a-8f0d6b3e5a72';

/**
 * The one action Hunt packaging mints. Everything a host needs done is Forensics Watch's
 * call once it has reconstructed what happened there; Hunt only names the host.
 */
export const HUNT_HANDOFF_ACTION_WORKFLOW_ID = ALERTZERO_ACTION_HANDOFF_TO_FORENSICS_WORKFLOW_ID;

/**
 * `host_name.maxLength` on the handoff action's input schema. An SSE entity value may be up to
 * 2048 characters, so a host past this bound would mint a Proposal whose approval fails trigger
 * validation after the analyst said yes; it is left to the recommendation instead.
 */
export const MAX_HANDOFF_HOST_NAME_LENGTH = 256;

/** `attributes.producer` on the knowledge indicator the handoff writes. */
export const HUNT_HANDOFF_PRODUCER = 'hunt.packageReport.handoff_to_forensics.v1';
/** `watch:` tag and `attributes.watch_id` on that indicator. */
export const HUNT_HANDOFF_WATCH_ID = 'hunt';
/**
 * `classification` the handoff carries. The Attack Discovery review sends its FP/TP
 * verdict here; a hunt has no verdict step, so it names the one bar it did clear.
 */
export const HUNT_HANDOFF_CLASSIFICATION = 'hunt_confirmed';

export const buildProposalSubjectKey = ({
  conversationId,
  hostName,
  actionWorkflowId,
}: {
  conversationId: string;
  hostName: string;
  actionWorkflowId: string;
}): string =>
  uuidv5(`${conversationId}|${hostName}|${actionWorkflowId}`, HUNT_PROPOSAL_SUBJECT_UUID_NAMESPACE);

/** One per run: a rerun of the same report must settle onto the same recommendation, not mint a second one. */
const buildRecommendationSubjectKey = (conversationId: string): string =>
  uuidv5(`${conversationId}|recommendation`, HUNT_PROPOSAL_SUBJECT_UUID_NAMESPACE);

/**
 * The `subject_id` the handoff action keys its knowledge indicator on
 * (`analyze-endpoint-{subject_id}`), stable per (space, report, host) so a re-approved
 * handoff for the same host replaces the indicator instead of appending one. The report
 * id stays readable; the host is hashed because hostnames carry characters an id should
 * not, and the space is folded in because every space's indicators share one index.
 */
export const buildHandoffSubjectId = ({
  spaceId,
  reportId,
  hostName,
}: {
  spaceId: string;
  reportId: string;
  hostName: string;
}): string => {
  const hostHash = createHash('sha256').update(`${spaceId}|${hostName}`).digest('hex');
  return `hunt-${reportId}-${hostHash.slice(0, 16)}`;
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
      ? ` Hosts handed to Forensics Watch: ${state.hosts.map((h) => h.name).join(', ')}.`
      : ' No host to hand to Forensics Watch.';
  return `${title}. Confirmed hit.${hostPart}${evidence}`;
};

/** Why the recommendation fired, one line per reason that actually held. */
const buildRecommendationReasonLines = ({
  hasHandoff,
  nonHostEvidence,
  unhandedHosts,
}: {
  hasHandoff: boolean;
  nonHostEvidence: boolean;
  unhandedHosts: CurrentRunHost[];
}): string[] => {
  const lines: string[] = [];
  if (!hasHandoff) {
    lines.push(
      'No host was observed in this finding, so there is nothing to hand to Forensics Watch.'
    );
  }
  if (nonHostEvidence) {
    lines.push(
      'Part of the evidence for this finding is not host-scoped, so a forensic run on the hosts alone would not close it.'
    );
  }
  if (unhandedHosts.length > 0) {
    lines.push(
      `${
        unhandedHosts.length === 1 ? 'A host name' : `${unhandedHosts.length} host names`
      } in this finding ${
        unhandedHosts.length === 1 ? 'is' : 'are'
      } longer than a handoff accepts (${MAX_HANDOFF_HOST_NAME_LENGTH} characters), so Forensics Watch was not asked about ${
        unhandedHosts.length === 1 ? 'it' : 'them'
      }.`
    );
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
  // Fixed, not per-host like buildHandoffTitle: this Proposal isn't scoped to one host,
  // so there's no single subject to name in a dynamic title.
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

const buildHandoffProposal = ({
  conversationId,
  spaceId,
  reportId,
  runId,
  host,
  state,
}: {
  conversationId: string;
  spaceId: string;
  reportId: string;
  runId: string;
  host: CurrentRunHost;
  state: CurrentRunState;
}): PackageReportMintPayload => ({
  subjectKey: buildProposalSubjectKey({
    conversationId,
    hostName: host.name,
    actionWorkflowId: HUNT_HANDOFF_ACTION_WORKFLOW_ID,
  }),
  conversationId,
  title: buildHandoffTitle({ host }),
  comment: buildHandoffComment({ host, state, reportId }),
  // The Attack Discovery review's own values for the same handoff, so the queue groups
  // and ranks both producers' handoffs alike.
  category: 'investigate',
  impact: 'high',
  confidence: 'medium',
  actionWorkflowId: HUNT_HANDOFF_ACTION_WORKFLOW_ID,
  // Exactly the shape `system-alertzero-action-handoff-to-forensics` declares: that action
  // closes `actionInput` to additional properties, so an extra key here fails at approval
  // time rather than being ignored. Ids and provenance only; the evidence stays on the
  // Investigation, which `investigation_id` points Forensics at.
  actionInput: {
    ai_index_id: HUNT_COVERAGE_AI_INDEX_ID,
    subject_id: buildHandoffSubjectId({ spaceId, reportId, hostName: host.name }),
    host_name: host.name,
    report_id: reportId,
    investigation_id: conversationId,
    classification: HUNT_HANDOFF_CLASSIFICATION,
    workflow_execution_id: runId,
    producer: HUNT_HANDOFF_PRODUCER,
    watch_id: HUNT_HANDOFF_WATCH_ID,
    context: buildHandoffContext({ host, state, reportId }),
  },
  hostName: host.name,
});

/**
 * One Forensics handoff per confirmed host, plus the analyst-recommendation mint rule for
 * what a host handoff cannot cover. Pure: no I/O.
 */
export const decidePackageReport = ({
  conversationId,
  spaceId,
  reportId,
  runId,
  state,
}: {
  conversationId: string;
  spaceId: string;
  reportId: string;
  runId: string;
  state: CurrentRunState;
}): DecidePackageReportResult => {
  const closureSummary = buildClosureSummary(state);

  if (!state.hasConfirmedHit) {
    return { dismiss: true, proposals: [], closureSummary };
  }

  const proposals: PackageReportMintPayload[] = [];
  const seenSubjectKeys = new Set<string>();
  const unhandedHosts = state.hosts.filter(
    (host) => host.name.length > MAX_HANDOFF_HOST_NAME_LENGTH
  );
  for (const host of state.hosts) {
    if (host.name.length > MAX_HANDOFF_HOST_NAME_LENGTH) {
      continue;
    }
    const proposal = buildHandoffProposal({
      conversationId,
      spaceId,
      reportId,
      runId,
      host,
      state,
    });
    if (seenSubjectKeys.has(proposal.subjectKey)) {
      continue;
    }
    seenSubjectKeys.add(proposal.subjectKey);
    proposals.push(proposal);
  }

  const hasHandoff = proposals.length > 0;
  const nonHostEvidence = state.hasNonHostEntity || state.hasIocIndicator;
  if (!hasHandoff || nonHostEvidence || unhandedHosts.length > 0) {
    const reasonLines = buildRecommendationReasonLines({
      hasHandoff,
      nonHostEvidence,
      unhandedHosts,
    });
    proposals.push(buildRecommendationProposal({ conversationId, state, reasonLines }));
  }

  return { dismiss: false, proposals, closureSummary };
};
