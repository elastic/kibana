/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_COMMENT_LENGTH, MAX_TITLE_LENGTH } from '@kbn/proposals-common';
import type { CurrentRunHost, CurrentRunState } from './types';

/** `context` on the handoff action's input schema; see action_handoff_to_forensics.yaml. */
export const MAX_HANDOFF_CONTEXT_LENGTH = 2000;

const addPeriod = (value: string): string => (value.endsWith('.') ? value : `${value}.`);

const pluralize = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

const huntConfirmedText = (
  state: CurrentRunState,
  host?: CurrentRunHost,
  { markdown = true }: { markdown?: boolean } = {}
): string | undefined => {
  if (state.titles.length === 0) {
    return undefined;
  }
  const titleText = state.titles.map((title) => (markdown ? `*${title}*` : title)).join(' and ');
  return host
    ? `Hunt Watch confirmed ${titleText} on ${host.name}`
    : `Hunt Watch confirmed ${titleText}`;
};

const evidenceSummaryText = (state: CurrentRunState): string | undefined => {
  const parts: string[] = [];
  if (state.evidence.tier1HitCount !== undefined) {
    parts.push(`Tier 1 matched ${pluralize(state.evidence.tier1HitCount, 'event')}`);
  }
  if (state.evidence.tier2Confirmed.length > 0) {
    const techniques = state.evidence.tier2Confirmed
      .map((t) => `${t.techniqueId} (${pluralize(t.rowCount, 'row')})`)
      .join(' and ');
    parts.push(`Tier 2 confirmed ${techniques}`);
  } else if (state.techniques.length > 0) {
    parts.push(`Techniques: ${state.techniques.join(', ')}`);
  }
  return parts.length > 0 ? parts.join('; ') : undefined;
};

/** One-line hunt context for the recommendation, combining the confirmed title and evidence summary. */
const buildHuntContextLine = (state: CurrentRunState): string | undefined => {
  const parts = [huntConfirmedText(state), evidenceSummaryText(state)].filter(
    (part): part is string => part !== undefined
  );
  return parts.length > 0 ? addPeriod(parts.join('; ')) : undefined;
};

/**
 * Plain-text title for the handoff Proposal. Verb-first and host-named so several
 * handoffs on one Investigation read as distinct rows: the queue row and attachment
 * card truncate with ellipsis, so the informative words come first.
 */
export const buildHandoffTitle = ({ host }: { host: CurrentRunHost }): string =>
  `Run a deep forensics investigation on ${host.name}`.slice(0, MAX_TITLE_LENGTH);

/**
 * "Action / Why / Approve-Dismiss" markdown body for the handoff Proposal, sourced from
 * structured run state. Says what approving commits to (a forensic run, and the
 * Investigation staying open for its report) and what it does not (nothing runs on the
 * host until an analyst approves a response Forensics Watch proposes).
 */
export const buildHandoffComment = ({
  host,
  state,
  reportId,
}: {
  host: CurrentRunHost;
  state: CurrentRunState;
  reportId: string;
}): string => {
  const whyLines = [
    huntConfirmedText(state, host),
    evidenceSummaryText(state),
    `Threat report \`${reportId}\` is the source; its Investigation holds the evidence`,
  ]
    .filter((line): line is string => line !== undefined)
    .map(addPeriod);

  const sections = [
    `**Action:** Hand **${host.name}** to Forensics Watch for a deep forensics investigation.`,
    '',
    '**Why**',
    ...whyLines.map((line) => `- ${line}`),
    '',
    'Forensics Watch reconstructs what happened on the host, when, and whether it spread, ' +
      'then decides which response actions to propose. Nothing runs on the host until an ' +
      'analyst approves one of those.',
    '',
    '**Approve** to **run a deep forensics investigation**; this Investigation stays open ' +
      'for the forensic report. **Dismiss** to record that this host needs no further ' +
      'analysis; the Investigation stays open until you close it.',
  ];
  return sections.join('\n').slice(0, MAX_COMMENT_LENGTH);
};

/**
 * Plain-text framing the forensic agent is given in place of "I have an alert on this
 * host": what Hunt Watch observed, against which report, in which window. No markdown,
 * since it lands inside an agent prompt, and bounded to the action input's own cap.
 */
export const buildHandoffContext = ({
  host,
  state,
  reportId,
}: {
  host: CurrentRunHost;
  state: CurrentRunState;
  reportId: string;
}): string => {
  const lines = [
    huntConfirmedText(state, host, { markdown: false }) ??
      `Hunt Watch confirmed activity on ${host.name}`,
    `The source is threat report ${reportId}`,
    evidenceSummaryText(state),
    state.huntWindow
      ? `The hunt window was ${state.huntWindow.from} to ${state.huntWindow.to}`
      : undefined,
    state.corroboratedTechniques.length > 0
      ? `Corroborated ATT&CK techniques: ${state.corroboratedTechniques.join(', ')}`
      : undefined,
  ]
    .filter((line): line is string => line !== undefined)
    .map(addPeriod);
  return lines.join(' ').slice(0, MAX_HANDOFF_CONTEXT_LENGTH);
};

/**
 * "Action / Why / Recommended steps" markdown body for the analyst-recommendation proposal:
 * no automated action, so the reasons and any manual remediation are the whole story.
 */
export const buildRecommendationComment = ({
  reasonLines,
  manualRemediation,
  state,
}: {
  reasonLines: string[];
  manualRemediation: string[];
  state: CurrentRunState;
}): string => {
  const sections = [
    '**Action:** Analyst follow-up. No automated action is proposed.',
    '',
    '**Why**',
    ...reasonLines.map((line) => `- ${line}`),
  ];
  if (manualRemediation.length > 0) {
    sections.push('', '**Recommended steps**', ...manualRemediation.map((line) => `- ${line}`));
  }
  const contextLine = buildHuntContextLine(state);
  if (contextLine) {
    sections.push('', contextLine);
  }
  return sections.join('\n').slice(0, MAX_COMMENT_LENGTH);
};
