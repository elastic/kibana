/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, getKqlFieldNames, toElasticsearchQuery } from '@kbn/es-query';
import {
  fullyEscapeKQLStringParam,
  prepareKQLStringParam,
} from '../../../../../../common/utils/kql';
import {
  MAX_FIND_RULES_WITH_FACETS_FILTER_KQL_LENGTH,
  MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH,
} from '../../../../../../common/api/detection_engine/rule_management/find_rules_with_facets/find_rules_with_facets_limits';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../rule_assets/prebuilt_rule_assets_type';

/** Friendly KQL field names accepted for prebuilt rule assets (mapped to SO attribute paths). */
const ASSET_KQL_ALIAS_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\brule_id\b(\s*):/g, replacement: `${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id$1:` },
  { pattern: /\bname\b(\s*):/g, replacement: `${PREBUILT_RULE_ASSETS_SO_TYPE}.name.keyword$1:` },
  { pattern: /\btags\b(\s*):/g, replacement: `${PREBUILT_RULE_ASSETS_SO_TYPE}.tags$1:` },
  { pattern: /\bseverity\b(\s*):/g, replacement: `${PREBUILT_RULE_ASSETS_SO_TYPE}.severity$1:` },
  {
    pattern: /\brisk_score\b(\s*):/g,
    replacement: `${PREBUILT_RULE_ASSETS_SO_TYPE}.risk_score$1:`,
  },
];

const ALLOWED_ASSET_KQL_FIELD_PREFIX = `${PREBUILT_RULE_ASSETS_SO_TYPE}.`;

export const expandPrebuiltAssetsKqlFieldAliases = (kql: string): string => {
  let out = kql;
  for (const { pattern, replacement } of ASSET_KQL_ALIAS_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
};

export const validatePrebuiltAssetsKqlFilter = (filter: string | undefined): string[] => {
  if (filter == null || filter.trim() === '') {
    return [];
  }
  if (filter.length > MAX_FIND_RULES_WITH_FACETS_FILTER_KQL_LENGTH) {
    return [`filter exceeds maximum length of ${MAX_FIND_RULES_WITH_FACETS_FILTER_KQL_LENGTH}`];
  }
  const expanded = expandPrebuiltAssetsKqlFieldAliases(filter);
  try {
    const node = fromKueryExpression(expanded);
    const fieldNames = getKqlFieldNames(node);
    for (const field of fieldNames) {
      if (!field.startsWith(ALLOWED_ASSET_KQL_FIELD_PREFIX)) {
        return [
          `unsupported field "${field}" in prebuilt assets filter; allowed aliases: name, tags, severity, risk_score, rule_id`,
        ];
      }
    }
    return [];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return [`invalid KQL filter: ${message}`];
  }
};

export const validatePrebuiltAssetsSearchTerm = (searchTerm: string | undefined): string[] => {
  if (searchTerm == null || searchTerm === '') {
    return [];
  }
  if (searchTerm.length > MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH) {
    return [`search_term exceeds maximum length of ${MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH}`];
  }
  return [];
};

/**
 * Legacy-style free text across name, tags, and rule_id (same spirit as rule management search).
 */
export const buildPrebuiltAssetLegacySearchKql = (searchTerm: string): string => {
  const so = PREBUILT_RULE_ASSETS_SO_TYPE;
  const escapedTerm = fullyEscapeKQLStringParam(searchTerm);
  const isSingleTerm = escapedTerm.split(' ').length === 1;
  const namePart = isSingleTerm
    ? `${so}.name.keyword: *${escapedTerm}*`
    : `${so}.name: ${prepareKQLStringParam(searchTerm)}`;
  return `(${namePart}) OR (${so}.tags: ${prepareKQLStringParam(
    searchTerm
  )}) OR (${so}.rule_id: ${prepareKQLStringParam(searchTerm)})`;
};

export const buildPrebuiltAssetsCombinedKql = ({
  filter,
  searchTerm,
  searchMode,
}: {
  filter: string | undefined;
  searchTerm: string | undefined;
  searchMode: string | undefined;
}): string | undefined => {
  const parts: string[] = [];
  const trimmedFilter = filter?.trim();
  if (trimmedFilter) {
    parts.push(`(${expandPrebuiltAssetsKqlFieldAliases(trimmedFilter)})`);
  }

  const mode = searchMode ?? 'legacy';
  const trimmedSearch = searchTerm?.trim();
  if (trimmedSearch && mode === 'legacy') {
    parts.push(`(${buildPrebuiltAssetLegacySearchKql(trimmedSearch)})`);
  }

  if (parts.length === 0) {
    return undefined;
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return parts.join(' AND ');
};

export const prebuiltAssetsKqlToEsQuery = (
  kql: string | undefined
): QueryDslQueryContainer | undefined => {
  if (kql == null || kql.trim() === '') {
    return undefined;
  }
  const node = fromKueryExpression(kql);
  return toElasticsearchQuery(node, undefined);
};
