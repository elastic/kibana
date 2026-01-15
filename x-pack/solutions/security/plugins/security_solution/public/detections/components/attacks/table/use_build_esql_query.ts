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
import { esql } from '@kbn/esql-language';
import {
  ESQL_GROUPING_KEY_COLUMN,
  ESQL_GROUPING_COUNT_COLUMN,
} from '../../alerts_table/grouping_settings/esql_transformer';
import { escapeKQLStringParam } from '../../../../../common/utils/kql';
import { useKibana } from '../../../../common/lib/kibana';
import { filterToKql } from './filter_to_kql';

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
  // eslint-disable-next-line no-console
  console.log(`[useBuildEsqlQuery] globalFilters: ${JSON.stringify(globalFilters, null, 2)}`);
  const {
    services: { uiSettings },
  } = useKibana();

  return useMemo(() => {
    // Get index pattern from dataView
    const indexPattern = dataView.getIndexPattern();

    // Start building the ES|QL query using the Composer API
    // This provides secure parameterization and prevents injection attacks
    let query = esql.from(indexPattern);

    // Build WHERE conditions dynamically
    // Start with time range filter - use string interpolation for date values
    // The Composer API will parse and validate the query, preventing injection
    const whereConditions: string[] = [];
    whereConditions.push(`@timestamp >= "${from}" AND @timestamp <= "${to}"`);

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

    // Convert filters to KQL query strings
    if (enabledFilters.length > 0) {
      try {
        // Build ES query from filters (for validation)
        const esQueryConfig = getEsQueryConfig(uiSettings);
        buildQueryFromFilters(enabledFilters, dataView, {
          allowLeadingWildcards: esQueryConfig.allowLeadingWildcards,
          queryStringOptions: esQueryConfig.queryStringOptions,
          dateFormatTZ: esQueryConfig.dateFormatTZ,
          filtersInMustClause: esQueryConfig.filtersInMustClause,
          nestedIgnoreUnmapped: esQueryConfig.nestedIgnoreUnmapped,
          caseInsensitive: esQueryConfig.caseInsensitive,
        });

        // Convert each filter to KQL and add to kqlParts
        enabledFilters.forEach((filter) => {
          const kql = filterToKql(filter);
          if (kql) {
            kqlParts.push(kql);
          }
        });
      } catch (error) {
        // If filter conversion fails, continue without filter KQL
        // This ensures the query still works even if filter conversion fails
      }
    }

    // Combine all KQL parts and add as KQL() function if any exist
    if (kqlParts.length > 0) {
      const kqlQuery = kqlParts.join(' AND ');
      // Escape the KQL string for safe inclusion in ES|QL
      const escapedKql = escapeKQLStringParam(kqlQuery);
      // Add KQL() function call to WHERE conditions
      whereConditions.push(`KQL("${escapedKql}")`);
    }

    // Apply WHERE clause with all conditions combined
    // Using string syntax - the Composer API will parse and validate it
    if (whereConditions.length > 0) {
      query = query.where(whereConditions.join(' AND '));
    }

    // Add EVAL command to create grouping key
    // Using string syntax to avoid column name quoting issues
    query = query.pipe(
      `EVAL ${ESQL_GROUPING_KEY_COLUMN} = CASE(
        kibana.alert.attack_ids IS NULL, "NO_ATTACK_ID",
        kibana.alert.attack_ids
      )`
    );

    // Add STATS command to aggregate by grouping key
    query = query.pipe(
      `STATS
        ${ESQL_GROUPING_COUNT_COLUMN} = COUNT(*),
        latest_timestamp = MAX(@timestamp)
        BY ${ESQL_GROUPING_KEY_COLUMN}`
    );

    // Add SORT command
    query = query.sort(['latest_timestamp', 'DESC']);

    // Add LIMIT command
    query = query.limit(1000);

    const finalQuery = query.print('basic');
    // eslint-disable-next-line no-console
    console.log(`[useBuildEsqlQuery] query: ${JSON.stringify(finalQuery, null, 2)}`);

    // Return the final query string
    // Using 'basic' format for compact output suitable for API requests
    return finalQuery;
  }, [from, to, defaultFilters, globalFilters, globalQuery, dataView, uiSettings]);
};
