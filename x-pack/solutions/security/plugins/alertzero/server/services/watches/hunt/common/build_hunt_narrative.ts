/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntForThreatResult, HuntIoc } from '@kbn/alertzero-common';
import type {
  HuntCoordinatorCoreResult,
  HuntCoordinatorTier2SkipReason,
} from '../hunt_coordinator';
import type { ValidatedBehavior } from '../tier2/types';

/**
 * Report and scope facts the coordinator learns while it runs, which the
 * result payload itself does not carry but the Investigation narrative cites.
 */
export interface HuntNarrativeContext {
  reportTitle?: string;
  requiredIndexPatterns?: string[];
  optionalIndexPatterns?: string[];
}

const MAX_LISTED = 6;
const MAX_BEHAVIORS_NARRATED = 8;
/** Under journal_note.yaml's `message` maxLength (8000) with headroom for the caller's suffix. */
export const MAX_HUNT_NARRATIVE_CHARS = 7000;

const plural = (count: number, singular: string, pluralForm = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : pluralForm}`;

const code = (value: string): string => `\`${value}\``;

const listOf = (items: string[], max = MAX_LISTED): string => {
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  if (shown.length === 0) return '';
  if (rest > 0) return `${shown.join(', ')} and ${plural(rest, 'more', 'more')}`;
  if (shown.length === 1) return shown[0];
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
};

const codeList = (items: string[], max = MAX_LISTED): string => listOf(items.map(code), max);

const describeIocs = (iocs: HuntIoc[]): string => {
  const byType = new Map<string, string[]>();
  for (const ioc of iocs) {
    const values = byType.get(ioc.type) ?? [];
    values.push(ioc.value);
    byType.set(ioc.type, values);
  }
  return [...byType.entries()].map(([type, values]) => `${type} ${codeList(values)}`).join('; ');
};

const describeReport = (result: HuntCoordinatorCoreResult, ctx: HuntNarrativeContext): string => {
  if (!result.report_id) return 'the supplied indicators';
  return ctx.reportTitle
    ? `threat report **"${ctx.reportTitle}"** (${code(result.report_id)})`
    : `threat report ${code(result.report_id)}`;
};

const describeTechnologies = (result: HuntCoordinatorCoreResult): string =>
  result.technologies.length > 0
    ? `${result.technologies.map(code).join(', ')} telemetry`
    : 'the environment';

const describeTier2Skip = (reason: HuntCoordinatorTier2SkipReason): string => {
  switch (reason) {
    case 'configured_never':
      return 'Tier 2 behavior hunting was turned off for this run.';
    case 'no_environment_hits':
      return 'Tier 2 behavior hunting was skipped because Tier 1 found no environment hits and this run only escalates to Tier 2 on a hit.';
    case 'no_inference':
      return 'Tier 2 behavior hunting was skipped because no GenAI connector was available.';
    case 'no_report_text':
      return 'Tier 2 behavior hunting was skipped because the report has no body text to derive behaviors from.';
    case 'no_searchable_input':
      return 'Tier 2 behavior hunting was skipped because the report exposed nothing to search for.';
    case 'tier2_failed':
      return 'Tier 2 behavior hunting failed before it could finish.';
    case 'report_not_found':
    case 'scope_blocked':
      return '';
  }
};

const describeBehavior = (behavior: ValidatedBehavior): string => {
  const label = `**${behavior.technique_id} ${behavior.technique_name}**`.trim();
  const confidence = `confidence ${Math.round(behavior.confidence * 100)}%`;
  const meta = behavior.rule_name
    ? ` ("${behavior.rule_name}", ${behavior.severity}, ${confidence})`
    : ` (${behavior.severity}, ${confidence})`;
  const { execution } = behavior;
  if (!execution || !execution.executed) {
    return `- ${label}${meta}: validated but not executed against the environment.`;
  }
  if (!execution.hit) {
    return `- ${label}${meta}: executed and matched no rows in the hunt window.`;
  }
  const hosts = behavior.affected_hosts ?? [];
  const users = behavior.affected_users ?? [];
  const where: string[] = [];
  if (hosts.length > 0) {
    where.push(`${hosts.length === 1 ? 'host' : 'hosts'} ${codeList(hosts)}`);
  }
  if (users.length > 0) {
    where.push(`${users.length === 1 ? 'user' : 'users'} ${codeList(users)}`);
  }
  const whereText = where.length > 0 ? ` involving ${where.join(' and ')}` : '';
  return `- ${label}${meta}: executed and matched ${plural(
    execution.row_count,
    'row'
  )}${whereText}.`;
};

const describeTier2 = (result: HuntCoordinatorCoreResult): string[] => {
  const lines: string[] = ['**Tier 2: behavior hunts derived from the report**'];
  const { tier2 } = result;
  if (!tier2) {
    if (result.tier2_skipped_reason) {
      const skip = describeTier2Skip(result.tier2_skipped_reason);
      lines.push(
        result.tier2_skipped_reason === 'tier2_failed' ? `${skip} ${result.message}` : skip
      );
    }
    return lines;
  }

  if (tier2.status === 'no_behaviors_found') {
    lines.push('Tier 2 read the report text and derived no behaviors to hunt.');
    return lines;
  }
  if (tier2.status === 'no_behaviors_validated') {
    lines.push(
      'Tier 2 derived behaviors from the report text, but none survived ATT&CK catalog validation.'
    );
    return lines;
  }

  const behaviors = tier2.behaviors;
  const confirmed = behaviors.filter((b) => b.execution?.hit === true);
  const executed = behaviors.filter((b) => b.execution?.executed === true);
  lines.push(
    `Tier 2 derived ${plural(behaviors.length, 'behavior')} from the report text and validated ${
      behaviors.length === 1 ? 'it' : 'them'
    } against the ATT&CK catalog; ${
      executed.length
    } executed as ES|QL against the required indices and ${confirmed.length} matched live activity.`
  );
  for (const behavior of behaviors.slice(0, MAX_BEHAVIORS_NARRATED)) {
    lines.push(describeBehavior(behavior));
  }
  if (behaviors.length > MAX_BEHAVIORS_NARRATED) {
    const rest = behaviors.length - MAX_BEHAVIORS_NARRATED;
    lines.push(
      `- ${plural(rest, 'further behavior')} ${
        rest === 1 ? 'is' : 'are'
      } recorded on the attached findings.`
    );
  }
  return lines;
};

const describeTier1 = (tier1: HuntForThreatResult, hasConfirmedHit: boolean): string[] => {
  const lines: string[] = ['**Tier 1: indicator and technique search**'];
  if (tier1.status === 'no_searchable_terms') {
    lines.push(
      'Tier 1 had nothing to search: the report exposed no indicators or techniques that map to a searchable field.'
    );
    return lines;
  }
  if (tier1.counts.total_hits === 0) {
    lines.push('Tier 1 found no documents matching those indicators or techniques in the window.');
    return lines;
  }

  const requiredHits = tier1.per_index.filter((entry) => entry.required);
  let confirmation: string;
  if (!tier1.has_confirmed_hit && !hasConfirmedHit) {
    confirmation =
      'None of those matches were in a required index, so Tier 1 did not confirm the hit on its own.';
  } else if (!tier1.has_confirmed_hit) {
    confirmation = 'None of those matches were in a required index.';
  } else if (requiredHits.length > 0) {
    confirmation = `${plural(
      requiredHits.reduce((sum, entry) => sum + entry.hit_count, 0),
      'match',
      'matches'
    )} landed in ${
      requiredHits.length === 1 ? 'a required index' : 'required indices'
    }, which confirms the hit.`;
  } else {
    confirmation = '';
  }
  lines.push(
    `Tier 1 matched ${plural(tier1.counts.total_hits, 'document')} across ${plural(
      tier1.per_index.length,
      'index',
      'indices'
    )}. ${confirmation}`.trim()
  );
  for (const entry of tier1.per_index
    .slice()
    .sort((a, b) => b.hit_count - a.hit_count)
    .slice(0, MAX_LISTED)) {
    lines.push(`- ${code(entry.index)}${entry.required ? ' (required)' : ''}: ${entry.hit_count}`);
  }
  if (tier1.per_index.length > MAX_LISTED) {
    lines.push(`- ${plural(tier1.per_index.length - MAX_LISTED, 'more index', 'more indices')}`);
  }

  const matchedIocs = new Set<string>();
  const matchedTechniques = new Set<string>();
  for (const hit of tier1.hits) {
    if (hit.matched?.ioc?.value) matchedIocs.add(hit.matched.ioc.value);
    if (hit.matched?.technique_id) matchedTechniques.add(hit.matched.technique_id);
  }
  if (matchedIocs.size > 0) {
    lines.push(`- **Indicators seen in the sample:** ${codeList([...matchedIocs])}`);
  }
  if (matchedTechniques.size > 0) {
    lines.push(`- **Alerts tagged with:** ${codeList([...matchedTechniques])}`);
  }

  const nameAssets = (items: Array<{ name: string; hit_count: number }>): string =>
    listOf(items.map((asset) => `${code(asset.name)} (${asset.hit_count})`));
  if (tier1.affected_assets.hosts.length > 0) {
    lines.push(`- **Affected hosts:** ${nameAssets(tier1.affected_assets.hosts)}`);
  }
  if (tier1.affected_assets.users.length > 0) {
    lines.push(`- **Affected users:** ${nameAssets(tier1.affected_assets.users)}`);
  }
  if (tier1.affected_assets.services.length > 0) {
    lines.push(`- **Affected services:** ${nameAssets(tier1.affected_assets.services)}`);
  }
  return lines;
};

const describeSearch = (result: HuntCoordinatorCoreResult, ctx: HuntNarrativeContext): string[] => {
  const { tier1 } = result;
  const lines: string[] = ['**What was searched**'];
  lines.push(`- **Window:** ${tier1.time_range.from} to ${tier1.time_range.to}`);
  const scope: string[] = [];
  if (ctx.requiredIndexPatterns && ctx.requiredIndexPatterns.length > 0) {
    scope.push(`${ctx.requiredIndexPatterns.map(code).join(', ')} (required)`);
  }
  if (ctx.optionalIndexPatterns && ctx.optionalIndexPatterns.length > 0) {
    scope.push(`${ctx.optionalIndexPatterns.map(code).join(', ')} (optional)`);
  }
  if (scope.length > 0) lines.push(`- **Indices:** ${scope.join('; ')}`);
  const iocs = tier1.resolved_iocs;
  lines.push(
    iocs.length > 0
      ? `- **Indicators (${iocs.length}):** ${describeIocs(iocs)}`
      : '- **Indicators:** none searchable'
  );
  const techniques = tier1.resolved_techniques;
  lines.push(
    techniques.length > 0
      ? `- **ATT&CK techniques (${techniques.length}):** ${codeList(techniques)}`
      : '- **ATT&CK techniques:** none'
  );
  return lines;
};

/**
 * The coverage gaps the coordinator recorded (main's `completeness` model): a
 * zero-hit run is only a statement about the environment when every requested
 * search ran, so the narrative says plainly what this run could not look at.
 */
const describeCoverage = (result: HuntCoordinatorCoreResult): string[] => {
  if (result.completeness === 'complete') return [];
  const gaps = [...(result.tier1.incomplete ?? []), ...(result.tier2?.incomplete ?? [])];
  const seen = new Set<string>();
  const lines: string[] = [
    result.completeness === 'incomplete_retryable'
      ? '**Coverage: incomplete, retryable.** Part of the search did not run for a transient reason, so the report stays eligible for a later sweep and this run is not a statement that the environment is clean.'
      : '**Coverage: incomplete.** Part of the search cannot run in this space, and repeating the run would not change that; the report is retired, but this run is not a statement that the environment is clean.',
  ];
  for (const gap of gaps) {
    const key = `${gap.reason}:${gap.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`- ${gap.reason.replace(/_/g, ' ')}: ${gap.detail}`);
  }
  return lines;
};

const tier2Confirmed = (result: HuntCoordinatorCoreResult): ValidatedBehavior[] =>
  (result.tier2?.behaviors ?? []).filter((b) => b.execution?.hit === true);

const describeOutcome = (
  result: HuntCoordinatorCoreResult,
  ctx: HuntNarrativeContext
): { heading: string; summary: string } => {
  const report = describeReport(result, ctx);
  const tech = describeTechnologies(result);
  const confirmedBehaviors = tier2Confirmed(result);
  const tier1Hit = result.tier1.has_confirmed_hit;
  const tier2Hit = confirmedBehaviors.length > 0;

  if (result.status === 'blocked') {
    return {
      heading: 'Hunt Watch could not hunt this report',
      summary: `Hunt Watch could not hunt ${report}: no required index for ${
        result.technologies.length > 0
          ? result.technologies.map(code).join(', ')
          : 'the configured technologies'
      } exists in this space, so nothing was searched.`,
    };
  }
  if (result.tier2_skipped_reason === 'report_not_found') {
    return {
      heading: 'Hunt Watch could not hunt this report',
      summary: `Hunt Watch could not hunt ${report}: the report is not visible in this space, so nothing was searched.`,
    };
  }
  if (!result.completed_successfully && !result.has_confirmed_hit) {
    return {
      heading: 'Hunt Watch did not complete the hunt',
      summary: `Hunt Watch did not complete the hunt for ${report}: ${result.message}`,
    };
  }
  if (tier1Hit && tier2Hit) {
    return {
      heading: 'Hunt Watch confirmed a hit',
      summary: `Hunt Watch confirmed a hit for ${report} in ${tech}: Tier 1 matched the report's indicators in the environment and Tier 2 confirmed ${plural(
        confirmedBehaviors.length,
        'behavior'
      )} derived from the report text.`,
    };
  }
  if (tier1Hit) {
    const tier2Note = result.tier2
      ? result.tier2.status === 'behaviors_proposed'
        ? 'Tier 2 derived behaviors from the report text but none matched live activity.'
        : 'Tier 2 derived no executable behaviors from the report text.'
      : result.tier2_skipped_reason
      ? describeTier2Skip(result.tier2_skipped_reason)
      : '';
    return {
      heading: 'Hunt Watch confirmed a hit',
      summary:
        `Hunt Watch confirmed a hit for ${report} in ${tech}: Tier 1 matched the report's indicators in the environment. ${tier2Note}`.trim(),
    };
  }
  if (tier2Hit) {
    return {
      heading: 'Hunt Watch confirmed a hit',
      summary: `Hunt Watch confirmed a hit for ${report} in ${tech}: Tier 1 found no indicator matches, but Tier 2 confirmed ${plural(
        confirmedBehaviors.length,
        'behavior'
      )} derived from the report text.`,
    };
  }
  return {
    heading: 'Hunt Watch found no confirmed hits',
    summary: `Hunt Watch found no confirmed hits for ${report} in ${tech}.`,
  };
};

/** One short clause for the run conclusion, e.g. "confirmed hit: Tier 1 matched 121 documents; Tier 2 confirmed 2 of 5 behaviors". */
export const buildHuntHeadline = (result: HuntCoordinatorCoreResult): string => {
  if (result.status === 'blocked') {
    return `hunt blocked, no required index for ${
      result.technologies.length > 0
        ? result.technologies.join(', ')
        : 'the configured technologies'
    }`;
  }
  if (result.tier2_skipped_reason === 'report_not_found') {
    return 'hunt failed, the report is not visible in this space';
  }
  const { tier1, tier2 } = result;
  const tier1Part =
    tier1.status === 'no_searchable_terms'
      ? 'Tier 1 had nothing to search'
      : tier1.counts.total_hits === 0
      ? 'Tier 1 found no matches'
      : tier1.has_confirmed_hit
      ? `Tier 1 matched ${plural(tier1.counts.total_hits, 'document')}`
      : `Tier 1 matched ${plural(tier1.counts.total_hits, 'document')} in optional indices only`;
  let tier2Part: string;
  if (tier2) {
    const confirmed = tier2Confirmed(result).length;
    tier2Part =
      tier2.behaviors.length === 0
        ? 'Tier 2 derived no behaviors'
        : `Tier 2 confirmed ${confirmed} of ${plural(tier2.behaviors.length, 'behavior')}`;
  } else if (result.tier2_skipped_reason === 'tier2_failed') {
    tier2Part = 'Tier 2 failed';
  } else {
    tier2Part = 'Tier 2 skipped';
  }
  const outcome = result.has_confirmed_hit ? 'confirmed hit' : 'no confirmed hits';
  const coverage = result.completeness === 'complete' ? '' : '; coverage incomplete';
  return `${outcome}: ${tier1Part}; ${tier2Part}${coverage}`;
};

/**
 * The deterministic hunt results narrative the hunt child writes to the
 * Investigation, as markdown: a heading with the outcome, then "What was
 * searched", "Tier 1", and "Tier 2" sections with bullet lists. It tells the
 * whole story (what was hunted, where and when, what each tier found, and why
 * a tier did not run) and is self-sufficient because the SSE attachment may
 * not render in every UI yet.
 */
export const buildHuntNarrative = (
  result: HuntCoordinatorCoreResult,
  ctx: HuntNarrativeContext = {}
): string => {
  const { heading, summary } = describeOutcome(result, ctx);
  const blocks: string[] = [`### ${heading}`, summary];
  const terminal =
    result.status === 'blocked' || result.tier2_skipped_reason === 'report_not_found';
  if (!terminal) {
    blocks.push(describeCoverage(result).join('\n'));
    blocks.push(describeSearch(result, ctx).join('\n'));
    blocks.push(describeTier1(result.tier1, result.has_confirmed_hit).join('\n'));
    blocks.push(describeTier2(result).join('\n'));
  }
  blocks.push(`_Hunt run ${code(result.run_id)}._`);
  const narrative = blocks.filter((block) => block.length > 0).join('\n\n');
  return narrative.length > MAX_HUNT_NARRATIVE_CHARS
    ? `${narrative.slice(0, MAX_HUNT_NARRATIVE_CHARS - 1)}…`
    : narrative;
};
