/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncateAtWord, techniqueLabel } from './coverage_text';
import type { SelectedEsql } from './select_coverage_behavior';
import { MAX_VALIDATED_ESQL_CHARS } from './select_coverage_behavior';

/** The longer report body the skill reads as evidence; CE allows 64k in `content` overall. */
export const MAX_REPORT_EXCERPT_CHARS = 8000;

const formatWindow = (window?: { from: string; to: string }): string | undefined =>
  window ? `window ${window.from.slice(0, 10)} → ${window.to.slice(0, 10)}` : undefined;

/**
 * The `ES|QL:` line. A status line only: the query itself lives in `attributes.validated_esql`
 * so `content` never repeats it.
 */
const esqlLine = ({
  selected,
  executedCount,
  window,
}: {
  selected: SelectedEsql;
  executedCount: number;
  window?: { from: string; to: string };
}): string => {
  if (selected.esqlStatus === undefined || !selected.behavior) {
    return selected.omittedReason === 'too_long'
      ? `ES|QL: omitted: query exceeds the ${MAX_VALIDATED_ESQL_CHARS} character limit`
      : 'ES|QL: omitted: no behavior executed';
  }
  if (selected.esqlStatus === 'executed_inconclusive') {
    return `ES|QL: executed_inconclusive, rows could not be evaluated${
      formatWindow(window) ? `, ${formatWindow(window)}` : ''
    }`;
  }
  const parts = [
    selected.esqlStatus,
    `${selected.behavior.rowCount} ${selected.behavior.rowCount === 1 ? 'row' : 'rows'}`,
    ...(executedCount > 1 ? [`${executedCount} behaviors executed`] : []),
    ...(formatWindow(window) ? [formatWindow(window) as string] : []),
  ];
  return `ES|QL: ${parts.join(', ')}`;
};

/**
 * The skill's evidence pack: plain `Key: value` sections separated by one blank line. It is
 * not a hit/clean flag (`has_confirmed_hit` is). The threat story leads and the report
 * excerpt, which is the longest part, comes last.
 */
export const buildCoverageContent = ({
  threatSummary,
  techniqueId,
  techniqueName,
  dataSources,
  severity,
  selectedEsql,
  executedCount,
  window,
  evidenceLines = [],
  reportExcerpt,
}: {
  threatSummary: string;
  techniqueId?: string;
  techniqueName?: string;
  dataSources: string[];
  severity?: string;
  selectedEsql: SelectedEsql;
  executedCount: number;
  window?: { from: string; to: string };
  evidenceLines?: string[];
  reportExcerpt?: string;
}): string => {
  const sections = [
    `Threat:\n${threatSummary}`,
    ...(techniqueId ? [`Technique: ${techniqueLabel(techniqueId, techniqueName)}`] : []),
    ...(dataSources.length > 0 ? [`Data sources: ${dataSources.join(', ')}`] : []),
    ...(severity ? [`Severity: ${severity}`] : []),
    esqlLine({ selected: selectedEsql, executedCount, window }),
    ...(evidenceLines.length > 0
      ? [`Evidence:\n${evidenceLines.map((line) => `- ${line}`).join('\n')}`]
      : []),
    ...(reportExcerpt && reportExcerpt.trim() !== ''
      ? [`Report excerpt:\n${truncateAtWord(reportExcerpt, MAX_REPORT_EXCERPT_CHARS)}`]
      : []),
  ];
  return sections.join('\n\n');
};
