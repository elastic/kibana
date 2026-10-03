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
} from './types';

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
  processSelector,
}: {
  entry: ActionCatalogEntry;
  processSelector?: ProcessSelector;
}): string => {
  const name = entry.name.trim().toLowerCase();
  if (processSelector) {
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

const buildActionLine = ({
  entry,
  host,
  processSelector,
}: {
  entry: ActionCatalogEntry;
  host: CurrentRunHost;
  processSelector?: ProcessSelector;
}): string => {
  const name = sentenceCase(entry.name.trim());
  if (processSelector) {
    const verb = stripTrailingWord(name, 'process') ?? name;
    return `**Action:** ${verb} ${describeProcess(processSelector)} on **${
      host.name
    }** with Elastic Defend.`;
  }
  if (isHostAction(name)) {
    return `**Action:** ${name} **${host.name}** with Elastic Defend.`;
  }
  return `**Action:** ${name} on **${host.name}** with Elastic Defend.`;
};

/**
 * Verb-first Proposal title so two actions on the same host (or two processes on the same
 * host) read as distinct, not duplicates. Plain text: the queue row and attachment card
 * truncate with ellipsis, so informative words come first.
 */
export const buildProposalTitle = ({
  entry,
  host,
  processSelector,
}: {
  entry: ActionCatalogEntry;
  host: CurrentRunHost;
  processSelector?: ProcessSelector;
}): string => {
  const name = sentenceCase(entry.name.trim());
  let title: string;
  if (processSelector) {
    const verb = stripTrailingWord(name, 'process') ?? name;
    title = `${verb} ${describeProcessForTitle(processSelector)} on ${host.name}`;
  } else if (isHostAction(name)) {
    title = `${name} ${host.name}`;
  } else {
    title = `${name} on ${host.name}`;
  }
  return title.slice(0, MAX_TITLE_LENGTH);
};

/**
 * Short "Action / Why" markdown body for an executable proposal, sourced from structured run
 * state instead of the verbose, once-per-SSE `evidence_for`/`evidence_against` strings.
 */
export const buildProposalComment = ({
  entry,
  host,
  state,
  processSelector,
}: {
  entry: ActionCatalogEntry;
  host: CurrentRunHost;
  state: CurrentRunState;
  processSelector?: ProcessSelector;
}): string => {
  const actionLine = buildActionLine({ entry, host, processSelector });
  const evidenceLines = processSelector
    ? [processTechniqueText(state, processSelector), processLastSeenText(processSelector)]
    : [huntConfirmedText(state, host), evidenceSummaryText(state)];
  const whyLines = [...evidenceLines, buildActionRationale({ entry, processSelector })]
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
