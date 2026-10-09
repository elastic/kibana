/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import { MAX_COMMENT_LENGTH, MAX_TITLE_LENGTH } from '@kbn/proposals-common';
import type {
  CurrentRunHost,
  CurrentRunState,
  HuntEvidenceTechnique,
  ProcessSelector,
  Subject,
} from './types';

type IdentitySubject = Extract<Subject, { kind: 'user' | 'service' }>;

const sentenceCase = (value: string): string =>
  value.length === 0 ? value : `${value[0].toUpperCase()}${value.slice(1)}`;

/** Strips a trailing whole word (case-insensitively), e.g. `Kill process` -> `Kill`. */
const stripTrailingWord = (value: string, word: string): string | undefined => {
  const pattern = new RegExp(`\\s+${word}$`, 'i');
  return pattern.test(value) ? value.replace(pattern, '') : undefined;
};

const isHostAction = (name: string): boolean => /\bhost$/i.test(name);

const addPeriod = (value: string): string => (value.endsWith('.') ? value : `${value}.`);

const pluralize = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

/** Plain-text process label for the Proposal title, e.g. `powershell.exe (PID 4212)`. */
const describeProcessForTitle = (selector: ProcessSelector): string =>
  selector.pid !== undefined
    ? `${selector.processName} (PID ${selector.pid})`
    : selector.processName;

/** Markdown process label for the comment body, e.g. `` `powershell.exe` (PID 4212) ``. */
const describeProcess = (selector: ProcessSelector): string => {
  if (selector.pid !== undefined) {
    return `\`${selector.processName}\` (PID ${selector.pid})`;
  }
  if (selector.entityId !== undefined) {
    return `\`${selector.processName}\` (\`${selector.entityId}\`)`;
  }
  return `\`${selector.processName}\``;
};

/** e.g. `high_impact` -> `high impact`; the level an identity proposal would set, when it carries one. */
const criticalityLevelText = (actionInput: Record<string, unknown>): string | undefined => {
  const level = actionInput.criticality_level;
  return typeof level === 'string' ? level.replace(/_/g, ' ') : undefined;
};

/** e.g. `Hunt Watch confirmed *Hunt: PowerShell (T1059.001) [ti-repor]* on WIN-ANALYST01`, no trailing period. */
const huntConfirmedText = (state: CurrentRunState, host?: CurrentRunHost): string | undefined => {
  if (state.titles.length === 0) {
    return undefined;
  }
  const titleText = state.titles.map((title) => `*${title}*`).join(' and ');
  return host
    ? `Hunt Watch confirmed ${titleText} on ${host.name}`
    : `Hunt Watch confirmed ${titleText}`;
};

/** e.g. `Tier 1 matched 4 events; Tier 2 confirmed T1059.001 (3 rows) and T1078.004 (4 rows)`, no trailing period. */
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

/** e.g. `` `powershell.exe` (PID 4212) last seen 2026-09-27T16:34:41Z; it may have already exited ``, no trailing period. */
const processLastSeenText = (selector: ProcessSelector): string | undefined =>
  selector.observedAt
    ? `${describeProcess(selector)} last seen ${selector.observedAt}; it may have already exited`
    : undefined;

const findConfirmedTechnique = (
  state: CurrentRunState,
  techniqueId: string
): HuntEvidenceTechnique | undefined =>
  state.evidence.tier2Confirmed.find((t) => t.techniqueId === techniqueId);

/**
 * The one technique this specific process was matched against, not every technique confirmed
 * anywhere on the host — that host-wide list belongs to a host-scoped proposal (e.g. isolate),
 * not a proposal about this one process. Falls back to the report's Tier 1 hit count when the
 * process has no technique attribution (a plain Tier 1 sample, not a behavior-derived match).
 */
const processTechniqueText = (
  state: CurrentRunState,
  selector: ProcessSelector
): string | undefined => {
  if (selector.techniqueId) {
    const technique = findConfirmedTechnique(state, selector.techniqueId);
    const label = technique?.techniqueName
      ? `${technique.techniqueId} (${technique.techniqueName})`
      : selector.techniqueId;
    return technique
      ? `Implicated in ${label}: ${pluralize(
          technique.rowCount,
          'row'
        )} of matching activity confirmed in the hunt window`
      : `Implicated in ${label}, confirmed in the hunt window`;
  }
  return state.evidence.tier1HitCount !== undefined
    ? `Observed during the report's confirmed hunt window (Tier 1 matched ${pluralize(
        state.evidence.tier1HitCount,
        'event'
      )})`
    : undefined;
};

/**
 * Fixed, per-action-type sentence naming what the action actually does and why that closes this
 * finding — the catalog entry itself carries no such field. Matched by the action's own display
 * name (already used to build the verb-first title/Action line above), not a hardcoded workflow
 * id, so an unrecognized future action still gets a sensible generic line instead of nothing.
 */
const buildActionRationale = ({
  entry,
  subject,
}: {
  entry: ActionCatalogEntry;
  subject: Subject;
}): string => {
  const name = entry.name.trim().toLowerCase();
  if (subject.kind === 'user' || subject.kind === 'service') {
    if (name.startsWith('set asset criticality')) {
      return `Raising its asset criticality lifts its risk score and flags it on the ${subject.kind} entity page while its credentials are reviewed`;
    }
    return `This action responds to the ${subject.kind} directly`;
  }
  if (subject.kind === 'process') {
    if (name.startsWith('kill')) {
      return 'Killing it stops execution immediately';
    }
    if (name.startsWith('suspend')) {
      return 'Suspending it pauses execution without terminating the process, preserving state for investigation';
    }
    return 'This action responds to the process directly';
  }
  if (isHostAction(entry.name.trim())) {
    if (name.startsWith('isolate')) {
      return 'Isolating the host cuts off its network access, stopping further command-and-control, lateral movement, or data exfiltration while this activity is investigated';
    }
    return 'This action responds to the host directly';
  }
  return 'This action directly addresses the confirmed activity above';
};

/** One-line hunt context for the recommendation, combining the confirmed title and evidence summary. */
const buildHuntContextLine = (state: CurrentRunState): string | undefined => {
  const parts = [huntConfirmedText(state), evidenceSummaryText(state)].filter(
    (part): part is string => part !== undefined
  );
  return parts.length > 0 ? addPeriod(parts.join('; ')) : undefined;
};

const buildIdentityActionLine = ({
  entry,
  subject,
  actionInput,
}: {
  entry: ActionCatalogEntry;
  subject: IdentitySubject;
  actionInput: Record<string, unknown>;
}): string => {
  const name = sentenceCase(entry.name.trim());
  const level = actionInput.criticality_level;
  return typeof level === 'string'
    ? `**Action:** ${name} for ${subject.kind} **${subject.value}** to ${level}.`
    : `**Action:** ${name} for ${subject.kind} **${subject.value}**.`;
};

const buildActionLine = ({
  entry,
  subject,
  actionInput,
}: {
  entry: ActionCatalogEntry;
  subject: Subject;
  actionInput: Record<string, unknown>;
}): string => {
  if (subject.kind === 'user' || subject.kind === 'service') {
    return buildIdentityActionLine({ entry, subject, actionInput });
  }
  const name = sentenceCase(entry.name.trim());
  if (subject.kind === 'process') {
    const verb = stripTrailingWord(name, 'process') ?? name;
    return `**Action:** ${verb} ${describeProcess(subject.processSelector)} on **${
      subject.host.name
    }** with Elastic Defend.`;
  }
  if (isHostAction(name)) {
    return `**Action:** ${name} **${subject.host.name}** with Elastic Defend.`;
  }
  return `**Action:** ${name} on **${subject.host.name}** with Elastic Defend.`;
};

/**
 * Verb-first Proposal title so two actions on the same host (or two processes on the same
 * host) read as distinct, not duplicates. Plain text: the queue row and attachment card
 * truncate with ellipsis, so informative words come first. Identity titles name the level
 * when the action sets one (`Mark user dev-user high impact`).
 */
export const buildProposalTitle = ({
  entry,
  subject,
  actionInput,
}: {
  entry: ActionCatalogEntry;
  subject: Subject;
  actionInput: Record<string, unknown>;
}): string => {
  const name = sentenceCase(entry.name.trim());
  let title: string;
  if (subject.kind === 'user' || subject.kind === 'service') {
    const level = criticalityLevelText(actionInput);
    title = level
      ? `Mark ${subject.kind} ${subject.value} ${level}`
      : `${name} for ${subject.kind} ${subject.value}`;
  } else if (subject.kind === 'process') {
    const verb = stripTrailingWord(name, 'process') ?? name;
    title = `${verb} ${describeProcessForTitle(subject.processSelector)} on ${subject.host.name}`;
  } else if (isHostAction(name)) {
    title = `${name} ${subject.host.name}`;
  } else {
    title = `${name} on ${subject.host.name}`;
  }
  return title.slice(0, MAX_TITLE_LENGTH);
};

/** Evidence lines for the Why list, scoped to what the subject actually is. */
const buildEvidenceLines = (
  state: CurrentRunState,
  subject: Subject
): Array<string | undefined> => {
  switch (subject.kind) {
    case 'process':
      return [
        processTechniqueText(state, subject.processSelector),
        processLastSeenText(subject.processSelector),
      ];
    case 'host':
      return [huntConfirmedText(state, subject.host), evidenceSummaryText(state)];
    case 'user':
    case 'service':
      return [huntConfirmedText(state), evidenceSummaryText(state)];
  }
};

/**
 * Short "Action / Why" markdown body for an executable proposal, sourced from structured run
 * state instead of the verbose, once-per-SSE `evidence_for`/`evidence_against` strings.
 */
export const buildProposalComment = ({
  entry,
  subject,
  state,
  actionInput,
}: {
  entry: ActionCatalogEntry;
  subject: Subject;
  state: CurrentRunState;
  actionInput: Record<string, unknown>;
}): string => {
  const actionLine = buildActionLine({ entry, subject, actionInput });
  const whyLines = [...buildEvidenceLines(state, subject), buildActionRationale({ entry, subject })]
    .filter((line): line is string => line !== undefined)
    .map(addPeriod);

  const sections = [actionLine, '', '**Why**', ...whyLines.map((line) => `- ${line}`)];
  return sections.join('\n').slice(0, MAX_COMMENT_LENGTH);
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
