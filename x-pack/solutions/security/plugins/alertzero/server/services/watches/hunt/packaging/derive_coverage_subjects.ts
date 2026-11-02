/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCoverageContent } from './build_coverage_content';
import {
  buildCoverageDescription,
  buildCoverageTitle,
  findingPhrase,
} from './build_coverage_title';
import { buildThreatSummary } from './build_threat_summary';
import {
  eventDataSources,
  reportIntentDataSources,
  vendorFallbackDataSources,
} from './coverage_data_sources';
import { stripFindingTitle } from './coverage_text';
import { buildCoverageKiId } from './coverage_ki_id';
import type { ReportHuntContext } from './load_report_hunt_context';
import { selectCoverageBehavior, toCoverageBehaviors } from './select_coverage_behavior';
import type {
  CoordinatorInputs,
  CoverageBehavior,
  CoverageSubject,
  CurrentRunFinding,
  CurrentRunState,
} from './types';

/**
 * The slice of `CurrentRunState` this needs, plus what the caller resolved before the call.
 * Narrowed (rather than the full state) so a run with no current-run SSE at all -- a real
 * clean run -- can still derive subjects without fabricating fields it has no data for.
 * `findings` and `corroboratedTechniques` default to empty for that same caller: a run with no
 * SSE at all corroborated nothing.
 *
 * `severity` and `investigationSummary` are resolved by the caller (SSE-sourced on a hit,
 * report-sourced on a clean run; see `run_package_report.ts`) and apply to every subject the
 * run derives, so this function stays pure and run-scoped.
 */
export type CoverageSubjectState = Pick<
  CurrentRunState,
  'reportId' | 'techniques' | 'hasConfirmedHit' | 'corroboratedTechniques'
> &
  Partial<Pick<CurrentRunState, 'findings' | 'techniqueNames' | 'window' | 'severity'>> & {
    investigationSummary?: string;
    /** The coordinator result packaging was handed; the only source on a run with no SSE. */
    coordinator?: CoordinatorInputs;
    reportContext?: ReportHuntContext;
  };

const firstNonEmpty = (...lists: string[][]): string[] =>
  lists.find((list) => list.length > 0) ?? [];

/** The finding a subject is about: the one that corroborated its technique, else the report-scoped one. */
const pickFinding = (
  findings: CurrentRunFinding[],
  techniqueId: string | undefined
): CurrentRunFinding | undefined =>
  techniqueId === undefined
    ? findings.find((finding) => finding.corroboratedTechniqueId === undefined) ?? findings[0]
    : findings.find((finding) => finding.corroboratedTechniqueId === techniqueId);

/**
 * Source event indices attributed to a technique, or the report-scoped finding's whole hit set.
 * Events the hunt matched to the technique come first. Events with no technique (Tier 1 IOC
 * hits, which ride along on every technique's SSE as shared context) only count when the
 * technique has none of its own, so a CloudTrail IOC hit does not become the data source of a
 * process technique.
 */
const hitIndices = ({
  findings,
  finding,
  techniqueId,
}: {
  findings: CurrentRunFinding[];
  finding: CurrentRunFinding;
  techniqueId: string | undefined;
}): string[] => {
  if (techniqueId === undefined) {
    return [...finding.eventRefs.map((ref) => ref.index), ...finding.tier1Indices];
  }
  const matched = findings.flatMap((candidate) =>
    candidate.eventRefs.filter((ref) => ref.techniqueId === techniqueId).map((ref) => ref.index)
  );
  if (matched.length > 0) return matched;
  return findings.flatMap((candidate) =>
    candidate.corroboratedTechniqueId === techniqueId
      ? candidate.eventRefs.filter((ref) => ref.techniqueId === undefined).map((ref) => ref.index)
      : []
  );
};

/**
 * One coverage subject per technique on the current run; report-scoped when the run named no
 * techniques. Written for every swept report (hit or clean).
 *
 * A technique only claims a confirmed hit when it is in `state.corroboratedTechniques`: a
 * technique merely proposed (named on the report-scoped fallback entry's indicator list, never
 * individually corroborated) reads as an uneventful sweep instead, even when
 * `state.hasConfirmedHit` is true for the report as a whole.
 */
export const deriveCoverageSubjects = ({
  spaceId,
  state,
  investigationConversationId,
}: {
  spaceId: string;
  state: CoverageSubjectState;
  investigationConversationId: string;
}): CoverageSubject[] => {
  const findings = state.findings ?? [];
  const behaviors: CoverageBehavior[] = state.coordinator?.behaviors
    ? toCoverageBehaviors(state.coordinator.behaviors)
    : findings.flatMap((finding) => finding.behaviors);
  const reportIntentTargets = state.coordinator?.reportIntentTargets ?? [];
  const techniqueIds = state.techniques.length > 0 ? [...new Set(state.techniques)] : [undefined];

  return techniqueIds.map((techniqueId) => {
    const kiId = buildCoverageKiId({ spaceId, reportId: state.reportId, techniqueId });
    const confirmedHitForSubject =
      techniqueId !== undefined
        ? state.corroboratedTechniques.includes(techniqueId)
        : state.hasConfirmedHit;
    const finding = confirmedHitForSubject ? pickFinding(findings, techniqueId) : undefined;

    const selectedEsql = selectCoverageBehavior({ behaviors, techniqueId });
    const techniqueName =
      selectedEsql.behavior?.techniqueName ??
      (techniqueId ? state.techniqueNames?.[techniqueId] : undefined);
    const executedCount =
      techniqueId === undefined
        ? behaviors.length
        : behaviors.filter((behavior) => behavior.techniqueId === techniqueId).length;

    const hitRefIndices = finding ? hitIndices({ findings, finding, techniqueId }) : [];
    // Hit events that exist but name no dataset (plain pack indices) leave `data_sources`
    // empty: the report's own streams would be a guess about where the technique hit.
    const dataSources =
      hitRefIndices.length > 0
        ? eventDataSources(hitRefIndices)
        : firstNonEmpty(
            reportIntentDataSources({ reportIntentTargets, behaviors }),
            vendorFallbackDataSources({
              vendor: state.reportContext?.vendor,
              product: state.reportContext?.product,
            })
          );

    const hypothesis = finding?.hypothesis;
    const evidenceQuote = selectedEsql.behavior?.evidenceQuote;
    const threatSummary = buildThreatSummary({
      hasConfirmedHit: confirmedHitForSubject && finding !== undefined,
      hypothesis,
      evidenceQuote,
      report: state.reportContext,
      techniqueIds: techniqueId ? [techniqueId] : [],
      fallbackTitle: finding ? stripFindingTitle(finding.title) : undefined,
    });

    const phrase = finding
      ? findingPhrase({
          sseTitle: finding.title,
          hypothesis: hypothesis ?? evidenceQuote,
          techniqueId,
          techniqueName,
          reportTitle: state.reportContext?.title,
        })
      : state.reportContext?.title ?? 'Threat report with no environment hit';

    const needsReportBody =
      !confirmedHitForSubject || finding === undefined || hypothesis === undefined;

    return {
      kiId,
      reportId: state.reportId,
      technique: techniqueId,
      investigationConversationId,
      title: buildCoverageTitle({ techniqueId, techniqueName, phrase }),
      description: buildCoverageDescription({
        hasConfirmedHit: confirmedHitForSubject,
        techniqueId,
        techniqueName,
      }),
      content: buildCoverageContent({
        threatSummary,
        techniqueId,
        techniqueName,
        dataSources,
        severity: state.severity,
        selectedEsql,
        executedCount,
        window: state.window,
        evidenceLines: finding?.evidenceLines ?? [],
        reportExcerpt: needsReportBody ? state.reportContext?.bodyText : undefined,
      }),
      threatSummary,
      dataSources,
      ...(selectedEsql.validatedEsql
        ? { validatedEsql: selectedEsql.validatedEsql, esqlStatus: selectedEsql.esqlStatus }
        : {}),
      severity: state.severity,
      investigationSummary: state.investigationSummary,
      hasConfirmedHit: confirmedHitForSubject,
    };
  });
};
