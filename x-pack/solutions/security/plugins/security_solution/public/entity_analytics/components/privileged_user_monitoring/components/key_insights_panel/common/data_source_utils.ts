/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Determines if "Open in Lens" should be disabled for a given ESQL query
 * based on the data source it queries.
 *
 * @param esqlQuery - The ESQL query string
 * @returns boolean indicating if Lens actions should be disabled
 */
export const shouldDisableLensActions = (esqlQuery: string): boolean => {
  // Disable for ML anomalies data as it may not always be available
  // and can cause errors when opening in Lens
  if (esqlQuery.includes('.ml-anomalies')) {
    return true;
  }

  // You can add more conditions here for other problematic data sources
  // For example:
  // if (esqlQuery.includes('some-other-problematic-index')) {
  //   return true;
  // }

  return false;
};

/**
 * Gets the data source type from an ESQL query for better error handling
 * and data view configuration.
 *
 * @param esqlQuery - The ESQL query string
 * @returns string indicating the data source type
 */
export const getDataSourceType = (
  esqlQuery: string
): 'ml-anomalies' | 'alerts' | 'logs' | 'unknown' => {
  if (esqlQuery.includes('.ml-anomalies')) {
    return 'ml-anomalies';
  }
  if (esqlQuery.includes('.alerts-')) {
    return 'alerts';
  }
  if (esqlQuery.includes('logs-')) {
    return 'logs';
  }
  return 'unknown';
};
