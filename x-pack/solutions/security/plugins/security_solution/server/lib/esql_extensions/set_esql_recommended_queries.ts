/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { PluginSetup as ESQLSetup } from '@kbn/esql/server';

const METRICS_INDEX_PATTERN = 'metrics-*';

// Those are only Metrics Experience recommended queries that we can toggle on/off with a FF
const METRICS_EXPERIENCE_ESQL_RECOMMENDED_QUERIES = [
  {
    name: i18n.translate('xpack.securitySolution.esqlQueries.allMetrics.name', {
      defaultMessage: 'All metrics',
    }),
    query: `FROM ${METRICS_INDEX_PATTERN}`,
    description: i18n.translate('xpack.securitySolution.esqlQueries.allMetrics.description', {
      defaultMessage: 'Loads all available metrics',
    }),
  },
];

export function setEsqlRecommendedQueries(esqlPlugin: ESQLSetup) {
  const esqlExtensionsRegistry = esqlPlugin.getExtensionsRegistry();
  esqlExtensionsRegistry.setRecommendedQueries(
    [...METRICS_EXPERIENCE_ESQL_RECOMMENDED_QUERIES],
    'security'
  );
}

export function unsetMetricsExperienceEsqlRecommendedQueries(esqlPlugin: ESQLSetup) {
  const esqlExtensionsRegistry = esqlPlugin.getExtensionsRegistry();

  esqlExtensionsRegistry.unsetRecommendedQueries(
    METRICS_EXPERIENCE_ESQL_RECOMMENDED_QUERIES,
    'security'
  );
}
