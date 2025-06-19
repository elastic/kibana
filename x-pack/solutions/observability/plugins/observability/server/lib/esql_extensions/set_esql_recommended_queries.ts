/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetup as ESQLSetup } from '@kbn/esql/server';
import { i18n } from '@kbn/i18n';

const OBS_ESQL_RECOMMENDED_QUERIES = [
  {
    name: i18n.translate('xpack.observability.esqlQueries.k8sPodsByMemory.name', {
      defaultMessage: 'Kubernetes pods sorted by memory usage',
    }),
    query:
      'FROM metrics-* | WHERE kubernetes.pod.memory.usage.limit.pct IS NOT NULL | STATS memory_limit_pct = MAX(kubernetes.pod.memory.usage.limit.pct) BY kubernetes.pod.name | SORT memory_limit_pct DESC',
    description: i18n.translate('xpack.observability.esqlQueries.k8sPodsByMemory.description', {
      defaultMessage:
        'Lists Kubernetes pods sorted by memory usage percentage relative to their limit',
    }),
  },
  {
    name: i18n.translate('xpack.observability.esqlQueries.k8sPodsByCpu.name', {
      defaultMessage: 'Kubernetes pods sorted by CPU usage',
    }),
    query:
      'FROM metrics-* | WHERE kubernetes.pod.cpu.usage.limit.pct IS NOT NULL | STATS cpu_limit_pct = MAX(kubernetes.pod.cpu.usage.limit.pct) BY kubernetes.pod.name | SORT cpu_limit_pct DESC',
    description: i18n.translate('xpack.observability.esqlQueries.k8sPodsByCpu.description', {
      defaultMessage:
        'Lists Kubernetes pods sorted by CPU usage percentage relative to their limit',
    }),
  },
  {
    name: i18n.translate('xpack.observability.esqlQueries.logsWithErrorOrWarn.name', {
      defaultMessage: 'Logs with "error" or "warn" messages',
    }),
    query: 'FROM logs-* | WHERE KQL("message:error or message:warn")',
    description: i18n.translate('xpack.observability.esqlQueries.logsWithErrorOrWarn.description', {
      defaultMessage: 'Finds log entries where the message field contains "error" or "warn"',
    }),
  },
  {
    name: i18n.translate('xpack.observability.esqlQueries.errorsByHost.name', {
      defaultMessage: 'Error occurrences by host name',
    }),
    query:
      'FROM logs-* | WHERE KQL("error") | STATS count = COUNT(*) BY host.name | SORT count DESC | LIMIT 50',
    description: i18n.translate('xpack.observability.esqlQueries.errorsByHost.description', {
      defaultMessage:
        'Counts error occurrences by host name and shows the top 50 hosts with the most errors',
    }),
  },
];

export function setEsqlRecommendedQueries(esqlPlugin: ESQLSetup) {
  const esqlExtensionsRegistry = esqlPlugin.getExtensionsRegistry();
  esqlExtensionsRegistry.setRecommendedQueries(OBS_ESQL_RECOMMENDED_QUERIES, 'oblt');
}
