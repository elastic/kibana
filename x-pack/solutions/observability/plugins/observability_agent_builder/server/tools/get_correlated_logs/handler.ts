/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getLogsIndices } from '../../utils/get_logs_indices';
import { parseDatemath } from '../../utils/time';
import { DEFAULT_CORRELATION_IDENTIFIER_FIELDS } from './constants';
import { getAnchorLogs } from './fetch_anchor_logs/fetch_anchor_logs';
import { getCorrelatedLogsForAnchor } from './get_correlated_logs_for_anchor';

export function getNoResultsMessage({
  logId,
  kqlFilter,
  errorLogsOnly,
  correlationFields,
  start,
  end,
}: {
  logId: string | undefined;
  kqlFilter: string | undefined;
  errorLogsOnly: boolean;
  correlationFields: string[];
  start: string;
  end: string;
}): string {
  const isUsingDefaultCorrelationFields =
    correlationFields === DEFAULT_CORRELATION_IDENTIFIER_FIELDS;

  const correlationFieldsDescription = isUsingDefaultCorrelationFields
    ? 'Matching logs exist but lack the default correlation fields (trace.id, request.id, transaction.id, etc.). Try using `correlationFields` for specifying custom correlation fields.'
    : `Matching logs exist but lack the custom correlation fields: ${correlationFields.join(', ')}`;

  if (logId) {
    return `The log ID "${logId}" was not found, or the log does not have any of the ${correlationFieldsDescription}.`;
  }

  const suggestions = [
    `No matching logs exist in this time range (${start} to ${end})`,
    ...(kqlFilter ? ['`kqlFilter` is too restrictive'] : []),
    ...(errorLogsOnly
      ? [
          'No error logs found (errorLogsOnly=true filters for ERROR/WARN/FATAL, HTTP 5xx, etc.). Try errorLogsOnly=false to include all log levels.',
        ]
      : []),
    correlationFieldsDescription,
  ];

  return `No log sequences found. Possible reasons: ${suggestions
    .map((s, i) => `(${i + 1}) ${s}`)
    .join(', ')}.`;
}

export async function getToolHandler({
  core,
  logger,
  esClient,
  start,
  end,
  kqlFilter,
  errorLogsOnly,
  index,
  correlationFields,
  logId,
  logSourceFields,
  maxSequences,
  maxLogsPerSequence,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  logger: Logger;
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  kqlFilter?: string;
  errorLogsOnly: boolean;
  index?: string;
  correlationFields: string[];
  logId?: string;
  logSourceFields: string[];
  maxSequences: number;
  maxLogsPerSequence: number;
}) {
  const logsIndices = index?.split(',') ?? (await getLogsIndices({ core, logger }));
  const startTime = parseDatemath(start);
  const endTime = parseDatemath(end, { roundUp: true });

  const anchorLogs = await getAnchorLogs({
    esClient,
    logsIndices,
    startTime,
    endTime,
    kqlFilter,
    errorLogsOnly,
    correlationFields,
    logger,
    logId,
    maxSequences,
  });

  // For each anchor log, find the correlated logs
  const sequences = await Promise.all(
    anchorLogs.map(async (anchorLog) => {
      const { logs, isTruncated } = await getCorrelatedLogsForAnchor({
        esClient,
        anchorLog,
        logsIndices,
        logger,
        logSourceFields,
        maxLogsPerSequence,
      });

      return {
        correlation: anchorLog.correlation,
        logs,
        isTruncated,
      };
    })
  );

  return { sequences };
}
