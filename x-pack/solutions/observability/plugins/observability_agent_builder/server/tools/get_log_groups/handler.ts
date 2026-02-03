/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import { orderBy } from 'lodash';
import {
  ERROR_CULPRIT,
  HTTP_RESPONSE_STATUS_CODE,
  TRANSACTION_NAME,
  TRANSACTION_ID,
  ERROR_LOG_MESSAGE,
  ERROR_GROUP_ID,
  ERROR_EXC_HANDLED,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  SERVICE_ENVIRONMENT,
  SERVICE_LANGUAGE_NAME,
  SERVICE_NAME,
  SPAN_ID,
  TRACE_ID,
  HTTP_REQUEST_METHOD,
  TRANSACTION_PAGE_URL,
  URL_FULL,
  ERROR_STACK_TRACE,
} from '@kbn/apm-types';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { parseDatemath } from '../../utils/time';
import { buildApmResources } from '../../utils/build_apm_resources';
import { getNonExceptionLogGroups } from './get_non_exception_logs_groups';
import { getSpanExceptionGroups } from './get_span_exception_groups';
import { getLogExceptionGroups } from './get_log_exception_groups';

export async function getToolHandler({
  core,
  plugins,
  request,
  logger,
  esClient,
  index,
  start,
  end,
  kqlFilter,
  fields,
  includeStackTrace,
  includeFirstSeen,
  size,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
  esClient: IScopedClusterClient;
  index?: string;
  start: string;
  end: string;
  kqlFilter?: string;
  fields: string[];
  includeStackTrace: boolean;
  includeFirstSeen: boolean;
  size: number;
}) {
  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end, { roundUp: true });
  const { apmEventClient } = await buildApmResources({ core, plugins, request, logger });

  const logGroupFields = [
    '_index',
    '@timestamp',
    'message',
    'log.level',

    // Error fields
    ERROR_CULPRIT,
    ERROR_EXC_HANDLED,
    ERROR_EXC_MESSAGE,
    ERROR_EXC_TYPE,
    ERROR_GROUP_ID,
    ERROR_LOG_MESSAGE,

    // Service fields
    SERVICE_ENVIRONMENT,
    SERVICE_LANGUAGE_NAME,
    SERVICE_NAME,

    // Trace fields
    SPAN_ID,
    TRACE_ID,
    TRANSACTION_ID,
    TRANSACTION_NAME,

    // HTTP fields
    HTTP_REQUEST_METHOD,
    HTTP_RESPONSE_STATUS_CODE,
    TRANSACTION_PAGE_URL,
    URL_FULL,

    // Stack trace if requested
    ...(includeStackTrace ? [ERROR_STACK_TRACE] : []),
    ...fields,
  ];

  const [spanExceptionGroups, logExceptionGroups, nonExceptionLogGroups] = await Promise.all([
    getSpanExceptionGroups({
      apmEventClient,
      logger,
      startMs,
      endMs,
      kqlFilter,
      includeFirstSeen,
      size,
      fields: logGroupFields,
    }),
    getLogExceptionGroups({
      core,
      logger,
      esClient,
      index,
      startMs,
      endMs,
      kqlFilter,
      size,
      fields: logGroupFields,
    }),
    getNonExceptionLogGroups({
      core,
      logger,
      esClient,
      index,
      startMs,
      endMs,
      kqlFilter,
      fields: logGroupFields,
      size,
    }),
  ]);

  return orderBy(
    [...spanExceptionGroups, ...logExceptionGroups, ...nonExceptionLogGroups].slice(0, size),
    (group) => group.count,
    ['desc']
  );
}
