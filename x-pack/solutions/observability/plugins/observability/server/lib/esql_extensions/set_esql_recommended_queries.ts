/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { PluginSetup as ESQLSetup } from '@kbn/esql/server';

const TRACES_INDEX_PATTERN = 'traces-*';
const METRICS_INDEX_PATTERN = 'metrics-*';
const LOGS_INDEX_PATTERN = 'logs-*';

const TRACES_ESQL_RECOMMENDED_QUERIES = [
  {
    name: i18n.translate('xpack.observability.recommendedQueries.findRootTraces.name', {
      defaultMessage: 'Root traces',
    }),
    query: `FROM ${TRACES_INDEX_PATTERN} | WHERE parent.id IS NULL`,
    description: i18n.translate(
      'xpack.observability.recommendedQueries.findRootTraces.description',
      {
        defaultMessage:
          'Display all root spans, which represent the start of a request or transaction. This is useful for getting a high-level overview of all operations in your system.',
      }
    ),
  },
  {
    name: i18n.translate('xpack.observability.recommendedQueries.slowDatabaseQueries.name', {
      defaultMessage: 'Database queries',
    }),
    query: `FROM ${TRACES_INDEX_PATTERN} | WHERE QSTR("span.type:db OR db.system.name:*")`,
    description: i18n.translate(
      'xpack.observability.recommendedQueries.slowDatabaseQueries.description',
      {
        defaultMessage: 'Pinpoint performance bottlenecks by finding all database (db) spans.',
      }
    ),
  },
  {
    name: i18n.translate('xpack.observability.recommendedQueries.allApplicationErrors.name', {
      defaultMessage: 'All application errors',
    }),
    query: `FROM ${LOGS_INDEX_PATTERN} | WHERE QSTR("processor.event:error OR event_name:exception")`,
    description: i18n.translate(
      'xpack.observability.recommendedQueries.allApplicationErrors.description',
      {
        defaultMessage:
          'Scan logs to find all documents marked as an error or exception, which is essential for monitoring and troubleshooting application failures.',
      }
    ),
  },
  {
    name: i18n.translate('xpack.observability.recommendedQueries.matchingUrlPattern.name', {
      defaultMessage: 'Spans matching URL pattern',
    }),
    query: `FROM ${TRACES_INDEX_PATTERN} | WHERE QSTR("""url.path: \\/api\\/*""")`,
    description: i18n.translate(
      'xpack.observability.recommendedQueries.matchingUrlPattern.description',
      {
        defaultMessage:
          'Find all spans which have url.path attribute matching a specified condition.',
      }
    ),
  },
];

const LOGS_AND_METRICS_ESQL_RECOMMENDED_QUERIES = [
  {
    name: i18n.translate('xpack.observability.esqlQueries.k8sPodsByMemory.name', {
      defaultMessage: 'Kubernetes pods sorted by memory usage',
    }),
    query: `FROM ${METRICS_INDEX_PATTERN} | WHERE kubernetes.pod.memory.usage.limit.pct IS NOT NULL | STATS memory_limit_pct = MAX(kubernetes.pod.memory.usage.limit.pct) BY kubernetes.pod.name | SORT memory_limit_pct DESC`,
    description: i18n.translate('xpack.observability.esqlQueries.k8sPodsByMemory.description', {
      defaultMessage:
        'Lists Kubernetes pods sorted by memory usage percentage relative to their limit',
    }),
  },
  {
    name: i18n.translate('xpack.observability.esqlQueries.k8sPodsByCpu.name', {
      defaultMessage: 'Kubernetes pods sorted by CPU usage',
    }),
    query: `FROM ${METRICS_INDEX_PATTERN} | WHERE kubernetes.pod.cpu.usage.limit.pct IS NOT NULL | STATS cpu_limit_pct = MAX(kubernetes.pod.cpu.usage.limit.pct) BY kubernetes.pod.name | SORT cpu_limit_pct DESC`,
    description: i18n.translate('xpack.observability.esqlQueries.k8sPodsByCpu.description', {
      defaultMessage:
        'Lists Kubernetes pods sorted by CPU usage percentage relative to their limit',
    }),
  },
  {
    name: i18n.translate('xpack.observability.esqlQueries.logsWithErrorOrWarn.name', {
      defaultMessage: 'Logs with "error" or "warn" messages',
    }),
    query: `FROM ${LOGS_INDEX_PATTERN} | WHERE QSTR("message:error OR message:warn")`,
    description: i18n.translate('xpack.observability.esqlQueries.logsWithErrorOrWarn.description', {
      defaultMessage: 'Finds log entries where the message field contains "error" or "warn"',
    }),
  },
  {
    name: i18n.translate('xpack.observability.esqlQueries.errorsByHost.name', {
      defaultMessage: 'Error occurrences by host name',
    }),
    query: `FROM ${LOGS_INDEX_PATTERN} | WHERE QSTR("error") | STATS count = COUNT(*) BY host.name | SORT count DESC | LIMIT 50`,
    description: i18n.translate('xpack.observability.esqlQueries.errorsByHost.description', {
      defaultMessage:
        'Counts error occurrences by host name and shows the top 50 hosts with the most errors',
    }),
  },
];

export function setEsqlRecommendedQueries(esqlPlugin: ESQLSetup) {
  const esqlExtensionsRegistry = esqlPlugin.getExtensionsRegistry();
  esqlExtensionsRegistry.setRecommendedQueries(
    [...TRACES_ESQL_RECOMMENDED_QUERIES, ...LOGS_AND_METRICS_ESQL_RECOMMENDED_QUERIES],
    'oblt'
  );
}
