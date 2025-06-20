/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { PluginSetup as ESQLSetup } from '@kbn/esql/server';

const TRACES_INDEX_PATTERN = 'traces-*';
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
    query: `FROM ${TRACES_INDEX_PATTERN} | WHERE QSTR("span.type:db OR db.system:*")`,
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

const OBS_ESQL_RECOMMENDED_QUERIES = [...TRACES_ESQL_RECOMMENDED_QUERIES];

export function setEsqlRecommendedQueries(esqlPlugin: ESQLSetup) {
  const esqlExtensionsRegistry = esqlPlugin.getExtensionsRegistry();
  esqlExtensionsRegistry.setRecommendedQueries(OBS_ESQL_RECOMMENDED_QUERIES, 'oblt');
}
