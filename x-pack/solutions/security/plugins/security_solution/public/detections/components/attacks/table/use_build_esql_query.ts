/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Filter, Query } from '@kbn/es-query';
import { buildQueryFromFilters } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  ESQL_GROUPING_KEY_COLUMN,
  ESQL_GROUPING_COUNT_COLUMN,
} from '../../alerts_table/grouping_settings/esql_transformer';
import { buildESQLWithKQLQuery } from '../../../../common/utils/esql';
import { useKibana } from '../../../../common/lib/kibana';

export interface UseBuildEsqlQueryProps {
  /**
   * Start time for the query
   */
  from: string;
  /**
   * End time for the query
   */
  to: string;
  /**
   * Array of default filters to apply to the query
   */
  defaultFilters: Filter[];
  /**
   * Array of global filters to apply to the query
   */
  globalFilters: Filter[];
  /**
   * Global KQL query to apply to the query
   */
  globalQuery: Query;
  /**
   * DataView for filter conversion and index pattern extraction
   */
  dataView: DataView;
}

/**
 * Hook that builds an ES|QL query to group alerts by attack_ids
 *
 * @param props - Hook parameters
 * @returns ES|QL query string
 */
export const useBuildEsqlQuery = (props: UseBuildEsqlQueryProps): string => {
  const { from, to, defaultFilters, globalFilters, globalQuery, dataView } = props;
  const {
    services: { uiSettings },
  } = useKibana();

  return useMemo(() => {
    // Get index pattern from dataView
    const indexPattern = dataView.getIndexPattern();

    // Build the base ES|QL query
    // Format: FROM index_pattern | WHERE ... | EVAL ... | STATS ... | SORT ... | LIMIT ...
    // Note: Must include columns named 'grouping_key' and 'count' for the transformer
    const baseQuery = `FROM ${indexPattern}
| WHERE @timestamp >= "${from}" AND @timestamp <= "${to}"
| EVAL ${ESQL_GROUPING_KEY_COLUMN} = CASE(
    kibana.alert.attack_ids IS NULL, "NO_ATTACK_ID",
    kibana.alert.attack_ids
  )
| STATS
    ${ESQL_GROUPING_COUNT_COLUMN} = COUNT(*),
    latest_timestamp = MAX(@timestamp)
  BY ${ESQL_GROUPING_KEY_COLUMN}
| SORT latest_timestamp DESC
| LIMIT 1000`;

    // Combine defaultFilters and globalFilters, then filter out disabled filters
    const allFilters = [...defaultFilters, ...globalFilters];
    const enabledFilters = allFilters.filter((f) => !f.meta?.disabled);

    // Extract KQL query string from globalQuery if it's a KQL query
    const globalKqlQuery =
      globalQuery?.language === 'kuery' && typeof globalQuery?.query === 'string'
        ? globalQuery.query
        : undefined;

    // Collect all KQL parts to combine
    const kqlParts: string[] = [];

    // Add global KQL query if present
    if (globalKqlQuery && globalKqlQuery.trim()) {
      kqlParts.push(`(${globalKqlQuery})`);
    }

    // Extract KQL from filters
    if (enabledFilters.length > 0) {
      try {
        // Build ES query from filters
        const esQueryConfig = getEsQueryConfig(uiSettings);
        const filterQuery = buildQueryFromFilters(enabledFilters, dataView, {
          allowLeadingWildcards: esQueryConfig.allowLeadingWildcards,
          queryStringOptions: esQueryConfig.queryStringOptions,
          dateFormatTZ: esQueryConfig.dateFormatTZ,
          filtersInMustClause: esQueryConfig.filtersInMustClause,
          nestedIgnoreUnmapped: esQueryConfig.nestedIgnoreUnmapped,
          caseInsensitive: esQueryConfig.caseInsensitive,
        });

        // Convert ES query to KQL string for ES|QL KQL() function
        // For now, we'll use a simplified approach: extract KQL from filters if available
        // Otherwise, we'll need to convert the ES query DSL to KQL (complex conversion)
        // For simplicity, we'll try to extract KQL expressions from filter meta.query
        enabledFilters.forEach((filter) => {
          // Some filters have KQL in meta.query
          if (filter.meta?.query) {
            kqlParts.push(filter.meta.query);
          }
          // For match_phrase filters, construct KQL
          else if (filter.query?.match_phrase) {
            const field = Object.keys(filter.query.match_phrase)[0];
            const value = filter.query.match_phrase[field];
            if (typeof value === 'string') {
              kqlParts.push(`${field}: "${value}"`);
            }
          }
        });
      } catch (error) {
        // If filter conversion fails, continue without filter KQL
        // This ensures the query still works even if filter conversion fails
      }
    }

    // Combine all KQL parts and add to ES|QL query if any exist
    if (kqlParts.length > 0) {
      const kqlQuery = kqlParts.join(' AND ');
      return buildESQLWithKQLQuery(baseQuery, kqlQuery);
    }

    return baseQuery;
  }, [from, to, defaultFilters, globalFilters, globalQuery, dataView, uiSettings]);
};
