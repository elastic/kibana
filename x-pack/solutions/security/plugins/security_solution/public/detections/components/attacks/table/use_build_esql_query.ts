/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { esql } from '@kbn/esql-language';
import {
  ESQL_GROUPING_KEY_COLUMN,
  ESQL_GROUPING_COUNT_COLUMN,
} from '../../alerts_table/grouping_settings/esql_transformer';

export interface UseBuildEsqlQueryProps {
  /**
   * DataView for index pattern extraction
   */
  dataView: DataView;
}

/**
 * Hook that builds an ES|QL query to group alerts by attack_ids.
 * Filters and time range are applied separately via the filter parameter in the API.
 *
 * @param props - Hook parameters
 * @returns ES|QL query string
 */
export const useBuildEsqlQuery = (props: UseBuildEsqlQueryProps): string => {
  const { dataView } = props;

  return useMemo(() => {
    // Get index pattern from dataView
    const indexPattern = dataView.getIndexPattern();

    // Start building the ES|QL query using the Composer API
    // This provides secure parameterization and prevents injection attacks
    let query = esql.from(indexPattern);

    // Add EVAL command to create grouping key
    // Using string syntax to avoid column name quoting issues
    query = query.pipe(
      `EVAL ${ESQL_GROUPING_KEY_COLUMN} = CASE(
        kibana.alert.attack_ids IS NULL, "-",
        kibana.alert.attack_ids
      )`
    );

    query = query.pipe(
      `EVAL is_detection_alert = kibana.alert.rule.rule_type_id != "attack-discovery"`
    );

    // Add STATS command to aggregate by grouping key
    query = query.pipe(
      `STATS
        // Detection alerts count
        ${ESQL_GROUPING_COUNT_COLUMN} = COUNT(CASE(is_detection_alert == true, 1, NULL)),

        // Sorting criteria
        sorting_criteria = MAX(@timestamp)
        // sorting_criteria = MAX(to_lower(kibana.alert.attack_discovery.title))
        // sorting_criteria = COUNT(CASE(is_detection_alert == true, 1, NULL))
        // detection_alert_count = COUNT(CASE(is_detection_alert == true, 1, NULL))

        BY ${ESQL_GROUPING_KEY_COLUMN}`
    );

    // Add SORT command
    query = query.sort(['sorting_criteria', 'DESC']);

    // Add LIMIT command
    query = query.limit(1000);

    const finalQuery = query.print('basic');
    // eslint-disable-next-line no-console
    console.log(`[useBuildEsqlQuery] query: ${JSON.stringify(finalQuery, null, 2)}`);

    // Return the final query string
    // Using 'basic' format for compact output suitable for API requests
    return finalQuery;
  }, [dataView]);
};
