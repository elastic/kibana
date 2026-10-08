/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { techniqueLabel } from './coverage_text';
import type { ReportHuntContext } from './load_report_hunt_context';
import { toCoverageBehaviors } from './select_coverage_behavior';
import type { CoordinatorInputs, CurrentRunState, DecidePackageReportResult } from './types';

/** CE's attribute string cap. */
export const MAX_INVESTIGATION_SUMMARY_CHARS = 10_000;

const formatWindow = (window?: { from: string; to: string }): string =>
  window ? ` Window: ${window.from.slice(0, 10)} → ${window.to.slice(0, 10)}.` : '';

/**
 * Joins complete sections in priority order and stops at the CE cap. A section that does not
 * fit is dropped whole, and so is an evidence line, and the cut is counted in a trailing note
 * rather than hidden behind an ellipsis: nothing kept is ever cut mid-string.
 */
const assembleSummary = ({
  sections,
  evidenceLines,
  evidenceIndex,
}: {
  sections: string[];
  /** Evidence lines, appended as their own section at `evidenceIndex`. */
  evidenceLines: string[];
  evidenceIndex: number;
}): string => {
  const budget = MAX_INVESTIGATION_SUMMARY_CHARS - 80; // room for the omission note
  // Evidence is the only part that can run long, so it fills what the sections after it leave
  // free rather than crowding them out.
  const reservedAfterEvidence = sections
    .slice(evidenceIndex)
    .reduce((total, text) => total + text.length + 1, 0);
  const kept: string[] = [];
  let used = 0;
  let omittedSections = 0;
  let omittedEvidence = 0;

  const ordered: Array<{ kind: 'text'; text: string } | { kind: 'evidence' }> = [
    ...sections.slice(0, evidenceIndex).map((text) => ({ kind: 'text' as const, text })),
    ...(evidenceLines.length > 0 ? [{ kind: 'evidence' as const }] : []),
    ...sections.slice(evidenceIndex).map((text) => ({ kind: 'text' as const, text })),
  ];

  for (const entry of ordered) {
    if (entry.kind === 'text') {
      if (used + entry.text.length + 1 > budget) {
        omittedSections += 1;
      } else {
        kept.push(entry.text);
        used += entry.text.length + 1;
      }
      continue;
    }
    const header = 'Evidence:';
    if (used + header.length + 1 > budget) {
      omittedSections += 1;
      continue;
    }
    const lines: string[] = [header];
    used += header.length + 1;
    for (const line of evidenceLines) {
      const bullet = `- ${line}`;
      if (used + bullet.length + 1 + reservedAfterEvidence > budget) {
        omittedEvidence += 1;
      } else {
        lines.push(bullet);
        used += bullet.length + 1;
      }
    }
    kept.push(lines.join('\n'));
  }

  const notes = [
    ...(omittedEvidence > 0 ? [`(+${omittedEvidence} evidence lines omitted)`] : []),
    ...(omittedSections > 0 ? [`(+${omittedSections} sections omitted)`] : []),
  ];
  return [...kept, ...notes].join('\n');
};

/**
 * What this hunt run did, for a run that confirmed a hit. Unlike the Investigation's closing
 * line it keeps every deduped evidence line and the full host and user names.
 */
export const buildInvestigationSummary = ({
  state,
  decided,
}: {
  state: CurrentRunState;
  decided: Pick<DecidePackageReportResult, 'dismiss' | 'proposals'>;
}): string => {
  const hitSources = [
    ...((state.evidence.tier1HitCount ?? 0) > 0 ? ['tier1'] : []),
    ...(state.evidence.tier2Confirmed.length > 0 ? ['tier2'] : []),
  ];
  const outcome = state.hasConfirmedHit
    ? `Outcome: confirmed hit${
        hitSources.length > 0 ? ` (${hitSources.join(', ')})` : ''
      }.${formatWindow(state.window)}`
    : `Outcome: no confirmed hits.${formatWindow(state.window)}`;

  const corroborated = state.corroboratedTechniques.map((id) =>
    techniqueLabel(id, state.techniqueNames[id])
  );
  const hosts = state.hosts.map((host) => host.name);
  const proposalTitles = decided.proposals.flatMap((proposal) =>
    proposal.title ? [proposal.title] : []
  );

  const sections = [
    outcome,
    ...(corroborated.length > 0 ? [`Techniques corroborated: ${corroborated.join(', ')}`] : []),
    ...(hosts.length > 0 ? [`Hosts: ${hosts.join(', ')}`] : []),
    ...(state.users.length > 0 ? [`Users: ${state.users.join(', ')}`] : []),
    decided.dismiss || decided.proposals.length === 0
      ? 'Packaging: dismissed, no proposals'
      : `Packaging: proposed ${decided.proposals.length} ${
          decided.proposals.length === 1 ? 'action' : 'actions'
        }${proposalTitles.length > 0 ? `: ${proposalTitles.join('; ')}` : ''}`,
  ];
  // Evidence sits after the entity sections and before the packaging line.
  return assembleSummary({
    sections,
    evidenceLines: state.evidenceLines,
    evidenceIndex: sections.length - 1,
  });
};

/** What this hunt run did, for a run that cleared no hit and left no SSE behind. */
export const buildCleanInvestigationSummary = ({
  inputs,
  reportContext,
}: {
  inputs: CoordinatorInputs;
  reportContext?: ReportHuntContext;
}): string => {
  const executed = toCoverageBehaviors(inputs.behaviors ?? []);
  const sections = [
    'Outcome: no confirmed hits. Nothing in this environment matched the report at the confirming-index bar.',
    ...(reportContext?.title ? [`Report: ${reportContext.title}`] : []),
    ...(executed.length > 0
      ? [
          `Behaviors executed: ${executed
            .map(
              (behavior) =>
                `${techniqueLabel(behavior.techniqueId, behavior.techniqueName)} (${
                  behavior.rowCount
                } ${behavior.rowCount === 1 ? 'row' : 'rows'})`
            )
            .join(', ')}`,
        ]
      : []),
    'Packaging: dismissed, no proposals',
  ];
  return assembleSummary({ sections, evidenceLines: [], evidenceIndex: sections.length });
};
