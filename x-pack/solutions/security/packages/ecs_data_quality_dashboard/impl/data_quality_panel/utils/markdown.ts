/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';
import { EMPTY_PLACEHOLDER, EMPTY_STAT } from '../constants';
import {
  ALL_FIELDS,
  CUSTOM_FIELDS,
  DETECTION_ENGINE_RULES_MAY_NOT_MATCH,
  DOCS,
  DOCUMENT_VALUES_ACTUAL,
  ECS_COMPLIANT_FIELDS,
  ECS_MAPPING_TYPE_EXPECTED,
  ECS_VALUES_EXPECTED,
  FIELD,
  ILM_PHASE,
  ILM_PHASE_CAPITALIZED,
  INCOMPATIBLE_CALLOUT,
  INCOMPATIBLE_CALLOUT_TITLE,
  INCOMPATIBLE_FIELDS,
  INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE,
  INCOMPATIBLE_FIELD_VALUES_TABLE_TITLE,
  INDEX,
  INDEX_MAPPING_TYPE_ACTUAL,
  INDICES,
  INDICES_CHECKED,
  MAPPINGS_THAT_CONFLICT_WITH_ECS,
  PAGES_MAY_NOT_DISPLAY_EVENTS,
  RESULT,
  SAME_FAMILY,
  SIZE,
} from '../translations';
import {
  AllowedValue,
  EnrichedFieldMetadata,
  IlmPhase,
  IncompatibleFieldMetadata,
  UnallowedValueCount,
} from '../types';
import { getDocsCountPercent } from './stats';

export const escapeNewlines = (content: string): string =>
  content.replaceAll('\n', ' ').replaceAll('|', '\\|');

export const getCodeFormattedValue = (value: string | undefined) =>
  `\`${escapeNewlines(value ?? EMPTY_PLACEHOLDER)}\``;

export const getHeaderSeparator = (headerText: string): string => '-'.repeat(headerText.length + 2); // 2 extra, for the spaces on both sides of the column name

export const getStatsRollupMarkdownComment = ({
  docsCount,
  formatBytes,
  formatNumber,
  incompatible,
  indices,
  indicesChecked,
  sizeInBytes,
}: {
  docsCount: number;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  incompatible: number | undefined;
  indices: number | undefined;
  indicesChecked: number | undefined;
  sizeInBytes: number | undefined;
}): string =>
  Number.isInteger(sizeInBytes)
    ? `| ${INCOMPATIBLE_FIELDS} | ${INDICES_CHECKED} | ${INDICES} | ${SIZE} | ${DOCS} |
|${getHeaderSeparator(INCOMPATIBLE_FIELDS)}|${getHeaderSeparator(
        INDICES_CHECKED
      )}|${getHeaderSeparator(INDICES)}|${getHeaderSeparator(SIZE)}|${getHeaderSeparator(DOCS)}|
| ${incompatible ?? EMPTY_STAT} | ${indicesChecked ?? EMPTY_STAT} | ${
        indices ?? EMPTY_STAT
      } | ${formatBytes(sizeInBytes)} | ${formatNumber(docsCount)} |
`
    : `| ${INCOMPATIBLE_FIELDS} | ${INDICES_CHECKED} | ${INDICES} | ${DOCS} |
|${getHeaderSeparator(INCOMPATIBLE_FIELDS)}|${getHeaderSeparator(
        INDICES_CHECKED
      )}|${getHeaderSeparator(INDICES)}|${getHeaderSeparator(DOCS)}|
| ${incompatible ?? EMPTY_STAT} | ${indicesChecked ?? EMPTY_STAT} | ${
        indices ?? EMPTY_STAT
      } | ${formatNumber(docsCount)} |
`;

export const getSummaryTableMarkdownHeader = (includeDocSize: boolean): string =>
  includeDocSize
    ? `| ${RESULT} | ${INDEX} | ${DOCS} | ${INCOMPATIBLE_FIELDS} | ${ILM_PHASE_CAPITALIZED} | ${SIZE} |
|${getHeaderSeparator(RESULT)}|${getHeaderSeparator(INDEX)}|${getHeaderSeparator(
        DOCS
      )}|${getHeaderSeparator(INCOMPATIBLE_FIELDS)}|${getHeaderSeparator(
        ILM_PHASE
      )}|${getHeaderSeparator(SIZE)}|`
    : `| ${RESULT} | ${INDEX} | ${DOCS} | ${INCOMPATIBLE_FIELDS} |
|${getHeaderSeparator(RESULT)}|${getHeaderSeparator(INDEX)}|${getHeaderSeparator(
        DOCS
      )}|${getHeaderSeparator(INCOMPATIBLE_FIELDS)}|`;

export const getResultEmoji = (incompatibleCount: number | undefined): string => {
  if (incompatibleCount == null) {
    return EMPTY_PLACEHOLDER;
  } else {
    return incompatibleCount === 0 ? '✅' : '❌';
  }
};

export const getSummaryTableMarkdownRow = ({
  docsCount,
  formatBytes,
  formatNumber,
  ilmPhase,
  incompatibleFieldsCount,
  indexName,
  isILMAvailable,
  patternDocsCount,
  sizeInBytes,
}: {
  docsCount: number;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  ilmPhase: IlmPhase | undefined;
  incompatibleFieldsCount: number | undefined;
  indexName: string;
  isILMAvailable: boolean;
  patternDocsCount?: number;
  sizeInBytes: number | undefined;
}): string => {
  const emojiColumn = getResultEmoji(incompatibleFieldsCount);
  const indexNameColumn = escapeNewlines(indexName);
  const docsCountColumn = formatNumber(docsCount);
  const incompatibleFieldsCountColumn = formatNumber(incompatibleFieldsCount);
  const docsCountPercentColumn = patternDocsCount
    ? `(${getDocsCountPercent({ docsCount, patternDocsCount })}) `
    : '';
  const baseColumns = `${emojiColumn} | ${indexNameColumn} | ${docsCountColumn} ${docsCountPercentColumn}| ${incompatibleFieldsCountColumn}`;

  if (isILMAvailable && Number.isInteger(sizeInBytes)) {
    const ilmPhaseColumn = ilmPhase != null ? getCodeFormattedValue(ilmPhase) : EMPTY_PLACEHOLDER;
    const sizeColumn = formatBytes(sizeInBytes);
    return `| ${baseColumns} | ${ilmPhaseColumn} | ${sizeColumn} |
`;
  }

  return `| ${baseColumns} |
`;
};

export const getMarkdownTableHeader = (headerNames: string[]) => `
| ${headerNames.map((name) => `${escapeNewlines(name)} | `).join('')}
|${headerNames.map((name) => `${getHeaderSeparator(name)}|`).join('')}`;

export const getSummaryTableMarkdownComment = ({
  docsCount,
  formatBytes,
  formatNumber,
  ilmPhase,
  indexName,
  isILMAvailable,
  incompatibleFieldsCount,
  patternDocsCount,
  sizeInBytes,
}: {
  docsCount: number;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  isILMAvailable: boolean;
  incompatibleFieldsCount: number;
  patternDocsCount?: number;
  sizeInBytes: number | undefined;
}): string =>
  `${getSummaryTableMarkdownHeader(isILMAvailable)}
${getSummaryTableMarkdownRow({
  docsCount,
  formatBytes,
  formatNumber,
  ilmPhase,
  indexName,
  isILMAvailable,
  incompatibleFieldsCount,
  patternDocsCount,
  sizeInBytes,
})}
`;

export const getSummaryMarkdownComment = (indexName: string) =>
  `### ${escapeNewlines(indexName)}
`;

export const getTabCountsMarkdownComment = (tabCounts: {
  allFieldsCount: number;
  customFieldsCount: number;
  ecsCompliantFieldsCount: number;
  incompatibleFieldsCount: number;
  sameFamilyFieldsCount: number;
}): string =>
  `### **${INCOMPATIBLE_FIELDS}** ${getCodeFormattedValue(
    `${tabCounts.incompatibleFieldsCount}`
  )} **${SAME_FAMILY}** ${getCodeFormattedValue(
    `${tabCounts.sameFamilyFieldsCount}`
  )} **${CUSTOM_FIELDS}** ${getCodeFormattedValue(
    `${tabCounts.customFieldsCount}`
  )} **${ECS_COMPLIANT_FIELDS}** ${getCodeFormattedValue(
    `${tabCounts.ecsCompliantFieldsCount}`
  )} **${ALL_FIELDS}** ${getCodeFormattedValue(`${tabCounts.allFieldsCount}`)}
`;

export const getIncompatibleMappings = (
  incompatibleFieldMetadata: IncompatibleFieldMetadata[]
): IncompatibleFieldMetadata[] =>
  incompatibleFieldMetadata.filter((x) => x.type !== x.indexFieldType);

export const getIncompatibleValues = (
  incompatibleFieldMetadata: IncompatibleFieldMetadata[]
): IncompatibleFieldMetadata[] =>
  incompatibleFieldMetadata.filter((x) => x.indexInvalidValues.length > 0);

export const getIncompatibleFieldsMarkdownComment = (incompatible: number): string =>
  getMarkdownComment({
    suggestedAction: `${INCOMPATIBLE_CALLOUT(EcsVersion)}

${DETECTION_ENGINE_RULES_MAY_NOT_MATCH}
${PAGES_MAY_NOT_DISPLAY_EVENTS}
${MAPPINGS_THAT_CONFLICT_WITH_ECS}
`,
    title: INCOMPATIBLE_CALLOUT_TITLE(incompatible),
  });

export const escapePreserveNewlines = (content: string | undefined): string | undefined =>
  content != null ? content.replaceAll('|', '\\|') : content;

export const getIndexInvalidValues = (indexInvalidValues: UnallowedValueCount[]): string =>
  indexInvalidValues.length === 0
    ? getCodeFormattedValue(undefined)
    : indexInvalidValues
        .map(
          ({ fieldName, count }) => `${getCodeFormattedValue(escapeNewlines(fieldName))} (${count})`
        )
        .join(', '); // newlines are instead joined with spaces

export const getAllowedValues = (allowedValues: AllowedValue[] | undefined): string =>
  allowedValues == null
    ? getCodeFormattedValue(undefined)
    : allowedValues.map((x) => getCodeFormattedValue(x.name)).join(', ');

export const getIncompatibleValuesMarkdownTableRows = (
  incompatibleValuesFields: IncompatibleFieldMetadata[]
): string =>
  incompatibleValuesFields
    .map(
      (x) =>
        `| ${escapeNewlines(x.indexFieldName)} | ${getAllowedValues(
          x.allowed_values
        )} | ${getIndexInvalidValues(x.indexInvalidValues)} |`
    )
    .join('\n');

export const getMarkdownComment = ({
  suggestedAction,
  title,
}: {
  suggestedAction: string;
  title: string;
}): string =>
  `#### ${escapeNewlines(title)}

${escapePreserveNewlines(suggestedAction)}`;

export const getIncompatibleMappingsMarkdownTableRows = (
  incompatibleMappingsFields: IncompatibleFieldMetadata[]
): string =>
  incompatibleMappingsFields
    .map(
      (x) =>
        `| ${escapeNewlines(x.indexFieldName)} | ${getCodeFormattedValue(
          x.type
        )} | ${getCodeFormattedValue(x.indexFieldType)} |`
    )
    .join('\n');

export const getMarkdownTable = <T extends EnrichedFieldMetadata[]>({
  enrichedFieldMetadata,
  getMarkdownTableRows,
  headerNames,
  title,
}: {
  enrichedFieldMetadata: T;
  getMarkdownTableRows: (enrichedFieldMetadata: T) => string;
  headerNames: string[];
  title: string;
}): string =>
  enrichedFieldMetadata.length > 0
    ? `#### ${escapeNewlines(title)}

${getMarkdownTableHeader(headerNames)}
${getMarkdownTableRows(enrichedFieldMetadata)}
`
    : '';

export const getIncompatibleFieldsMarkdownTablesComment = ({
  incompatibleMappingsFields,
  incompatibleValuesFields,
  indexName,
}: {
  incompatibleMappingsFields: IncompatibleFieldMetadata[];
  incompatibleValuesFields: IncompatibleFieldMetadata[];
  indexName: string;
}): string => `
${
  incompatibleMappingsFields.length > 0
    ? getMarkdownTable({
        enrichedFieldMetadata: incompatibleMappingsFields,
        getMarkdownTableRows: getIncompatibleMappingsMarkdownTableRows,
        headerNames: [FIELD, ECS_MAPPING_TYPE_EXPECTED, INDEX_MAPPING_TYPE_ACTUAL],
        title: INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE(indexName),
      })
    : ''
}
${
  incompatibleValuesFields.length > 0
    ? getMarkdownTable({
        enrichedFieldMetadata: incompatibleValuesFields,
        getMarkdownTableRows: getIncompatibleValuesMarkdownTableRows,
        headerNames: [FIELD, ECS_VALUES_EXPECTED, DOCUMENT_VALUES_ACTUAL],
        title: INCOMPATIBLE_FIELD_VALUES_TABLE_TITLE(indexName),
      })
    : ''
}
`;

export const getAllIncompatibleMarkdownComments = ({
  docsCount,
  formatBytes,
  formatNumber,
  ilmPhase,
  indexName,
  isILMAvailable,
  incompatibleMappingsFields,
  incompatibleValuesFields,
  sameFamilyFieldsCount,
  customFieldsCount,
  ecsCompliantFieldsCount,
  allFieldsCount,
  patternDocsCount,
  sizeInBytes,
}: {
  docsCount: number;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  isILMAvailable: boolean;
  incompatibleMappingsFields: IncompatibleFieldMetadata[];
  incompatibleValuesFields: IncompatibleFieldMetadata[];
  sameFamilyFieldsCount: number;
  customFieldsCount: number;
  ecsCompliantFieldsCount: number;
  allFieldsCount: number;
  patternDocsCount?: number;
  sizeInBytes: number | undefined;
}): string[] => {
  const incompatibleFieldsCount =
    incompatibleMappingsFields.length + incompatibleValuesFields.length;
  const incompatibleFieldsMarkdownComment =
    incompatibleFieldsCount > 0
      ? getIncompatibleFieldsMarkdownComment(incompatibleFieldsCount)
      : '';

  return [
    getSummaryMarkdownComment(indexName),
    getSummaryTableMarkdownComment({
      docsCount,
      formatBytes,
      formatNumber,
      ilmPhase,
      indexName,
      isILMAvailable,
      incompatibleFieldsCount,
      patternDocsCount,
      sizeInBytes,
    }),
    getTabCountsMarkdownComment({
      allFieldsCount,
      customFieldsCount,
      ecsCompliantFieldsCount,
      incompatibleFieldsCount,
      sameFamilyFieldsCount,
    }),
    incompatibleFieldsMarkdownComment,
    getIncompatibleFieldsMarkdownTablesComment({
      incompatibleMappingsFields,
      incompatibleValuesFields,
      indexName,
    }),
  ].filter((x) => x !== '');
};
