/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { getObservabilityDataSources } from '../../utils/get_observability_data_sources';
import { parseDatemath } from '../../utils/time';
import { getTraceIds } from './get_trace_ids';
import { getTraceDocuments } from './get_trace_documents';
import { DEFAULT_TRACE_FIELDS } from './constants';

export async function getToolHandler({
  core,
  plugins,
  logger,
  esClient,
  start,
  end,
  index,
  kqlFilter,
  fields = DEFAULT_TRACE_FIELDS,
  maxTraces,
  maxDocsPerTrace,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  index?: string;
  kqlFilter: string;
  fields?: string[];
  maxTraces: number;
  maxDocsPerTrace: number;
}) {
  const dataSources = await getObservabilityDataSources({ core, plugins, logger });
  const apmIndexPatterns = [
    dataSources.apmIndexPatterns.transaction,
    dataSources.apmIndexPatterns.span,
    dataSources.apmIndexPatterns.error,
  ].flatMap((pattern) => pattern.split(','));

  const allObservabilityIndices = [...apmIndexPatterns, ...dataSources.logIndexPatterns];

  const startTime = parseDatemath(start);
  const endTime = parseDatemath(end, { roundUp: true });

  const traceIds = await getTraceIds({
    esClient,
    indices: index?.split(',') ?? allObservabilityIndices,
    startTime,
    endTime,
    kqlFilter,
    logger,
    maxTraces,
  });

  if (traceIds.length === 0) {
    return { traces: [] };
  }
  // For each trace.id, we want to fetch all documents with an extended time window to try capture the full trace (transactions, spans, errors, and logs)
  const traceTimeWindow = {
    start: moment(startTime).subtract(5, 'minutes').valueOf(),
    end: moment(endTime).add(5, 'minutes').valueOf(),
  };
  const traces = await getTraceDocuments({
    esClient,
    traceIds,
    index: allObservabilityIndices,
    startTime: traceTimeWindow.start,
    endTime: traceTimeWindow.end,
    size: maxDocsPerTrace,
    fields,
  });

  return { traces };
}
