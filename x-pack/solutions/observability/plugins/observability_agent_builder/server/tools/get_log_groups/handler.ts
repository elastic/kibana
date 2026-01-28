/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import { orderBy } from 'lodash';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { parseDatemath } from '../../utils/time';
import { buildApmResources } from '../../utils/build_apm_resources';
import { getNonExceptionLogGroups } from './get_non_exception_logs_groups';
import { getApplicationExceptionGroups } from './get_application_exception_groups';
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

  const [applicationExceptionGroups, logExceptionGroups, nonExceptionLogGroups] = await Promise.all(
    [
      getApplicationExceptionGroups({
        apmEventClient,
        logger,
        startMs,
        endMs,
        kqlFilter,
        includeStackTrace,
        includeFirstSeen,
        size,
      }),
      getLogExceptionGroups({
        core,
        logger,
        esClient,
        index,
        startMs,
        endMs,
        kqlFilter,
        includeStackTrace,
        size,
        fields,
      }),
      getNonExceptionLogGroups({
        core,
        logger,
        esClient,
        index,
        startMs,
        endMs,
        kqlFilter,
        fields,
        size,
      }),
    ]
  );

  return {
    applicationExceptionGroups: orderBy(applicationExceptionGroups, ['count'], ['desc']),
    logExceptionGroups: orderBy(logExceptionGroups, ['count'], ['desc']),
    nonExceptionLogGroups: orderBy(nonExceptionLogGroups, ['count'], ['desc']),
  };
}
