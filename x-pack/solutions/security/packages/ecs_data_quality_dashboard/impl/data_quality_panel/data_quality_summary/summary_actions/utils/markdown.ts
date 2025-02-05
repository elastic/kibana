/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_PLACEHOLDER } from '../../../constants';
import {
  COLD,
  ERRORS_CALLOUT_SUMMARY,
  ERRORS_MAY_OCCUR,
  FROZEN,
  HOT,
  MANAGE,
  MONITOR,
  OR,
  READ,
  THE_FOLLOWING_PRIVILEGES_ARE_REQUIRED,
  UNMANAGED,
  VIEW_INDEX_METADATA,
  WARM,
} from '../../../translations';
import { ErrorSummary, IlmExplainPhaseCounts, PatternRollup } from '../../../types';
import {
  escapeNewlines,
  getCodeFormattedValue,
  getMarkdownTableHeader,
  getStatsRollupMarkdownComment,
} from '../../../utils/markdown';
import { getTotalPatternIncompatible, getTotalPatternIndicesChecked } from '../../../utils/stats';
import { DATA_QUALITY } from '../translations';

export const getIlmExplainPhaseCountsMarkdownComment = ({
  hot,
  warm,
  unmanaged,
  cold,
  frozen,
}: IlmExplainPhaseCounts): string =>
  [
    hot > 0 ? getCodeFormattedValue(`${HOT}(${hot})`) : '',
    warm > 0 ? getCodeFormattedValue(`${WARM}(${warm})`) : '',
    unmanaged > 0 ? getCodeFormattedValue(`${UNMANAGED}(${unmanaged})`) : '',
    cold > 0 ? getCodeFormattedValue(`${COLD}(${cold})`) : '',
    frozen > 0 ? getCodeFormattedValue(`${FROZEN}(${frozen})`) : '',
  ]
    .filter((x) => x !== '') // prevents extra whitespace
    .join(' ');

export const getPatternSummaryMarkdownComment = ({
  formatBytes,
  formatNumber,
  patternRollup,
  patternRollup: { docsCount, indices, ilmExplainPhaseCounts, pattern, results },
}: {
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  patternRollup: PatternRollup;
}): string =>
  `## ${escapeNewlines(pattern)}
${
  ilmExplainPhaseCounts != null
    ? getIlmExplainPhaseCountsMarkdownComment(ilmExplainPhaseCounts)
    : ''
}

${getStatsRollupMarkdownComment({
  docsCount: docsCount ?? 0,
  formatBytes,
  formatNumber,
  incompatible: getTotalPatternIncompatible(results),
  indices,
  indicesChecked: getTotalPatternIndicesChecked(patternRollup),
  sizeInBytes: patternRollup.sizeInBytes,
})}
`;

export const getDataQualitySummaryMarkdownComment = ({
  formatBytes,
  formatNumber,
  totalDocsCount,
  totalIncompatible,
  totalIndices,
  totalIndicesChecked,
  sizeInBytes,
}: {
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  totalDocsCount: number | undefined;
  totalIncompatible: number | undefined;
  totalIndices: number | undefined;
  totalIndicesChecked: number | undefined;
  sizeInBytes: number | undefined;
}): string =>
  `# ${DATA_QUALITY}

${getStatsRollupMarkdownComment({
  docsCount: totalDocsCount ?? 0,
  formatBytes,
  formatNumber,
  incompatible: totalIncompatible,
  indices: totalIndices,
  indicesChecked: totalIndicesChecked,
  sizeInBytes,
})}
`;

export const getErrorsMarkdownTable = ({
  errorSummary,
  getMarkdownTableRows,
  headerNames,
  title,
}: {
  errorSummary: ErrorSummary[];
  getMarkdownTableRows: (errorSummary: ErrorSummary[]) => string;
  headerNames: string[];
  title: string;
}): string =>
  errorSummary.length > 0
    ? `## ${escapeNewlines(title)}

${ERRORS_CALLOUT_SUMMARY}

${ERRORS_MAY_OCCUR}

${THE_FOLLOWING_PRIVILEGES_ARE_REQUIRED}
- \`${MONITOR}\` ${OR} \`${MANAGE}\`
- \`${VIEW_INDEX_METADATA}\`
- \`${READ}\`

${getMarkdownTableHeader(headerNames)}
${getMarkdownTableRows(errorSummary)}
`
    : '';

export const getErrorsMarkdownTableRows = (errorSummary: ErrorSummary[]): string =>
  errorSummary
    .map(
      ({ pattern, indexName, error }) =>
        `| ${escapeNewlines(pattern)} | ${escapeNewlines(
          indexName ?? EMPTY_PLACEHOLDER
        )} | ${getCodeFormattedValue(error)} |`
    )
    .join('\n');
