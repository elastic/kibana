/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { parseDatemath } from '../../../utils/time';
import type { ObservabilityAgentDataRegistry } from '../../../data_registry/data_registry';

export interface FetchApmErrorContextParams {
  dataRegistry: ObservabilityAgentDataRegistry;
  request: KibanaRequest;
  serviceName: string;
  environment?: string;
  start: string;
  end: string;
  errorId: string;
}

export async function fetchApmErrorContext({
  dataRegistry,
  request,
  serviceName,
  environment = '',
  start,
  end,
  errorId,
}: FetchApmErrorContextParams): Promise<string> {
  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end);

  const error =
    (await dataRegistry.getData('apmErrorById', {
      request,
      serviceName,
      serviceEnvironment: environment ?? '',
      start: startMs,
      end: endMs,
      errorId,
    })) ?? undefined;

  const downstreamDependencies =
    (await dataRegistry.getData('apmDownstreamDependencies', {
      request,
      serviceName,
      serviceEnvironment: environment ?? '',
      start,
      end,
    })) ?? [];

  const contextLines: string[] = [
    `Service: ${serviceName}`,
    `Environment: ${environment ?? ''}`,
    `Error ID: ${errorId}`,
  ];

  if (error) {
    contextLines.push(
      `Error group: ${error.error?.grouping_key ?? ''}`,
      `Name: ${error.error?.exception?.[0]?.type ?? ''}`,
      `Type: ${error.processor?.event ?? ''}`,
      `Culprit: ${error.error?.culprit ?? ''}`,
      `Trace ID: ${error.trace?.id ?? ''}`
    );
  }

  const traceId = error?.trace?.id;
  if (traceId) {
    const [traceOverview, traceErrors, logCategories] = await Promise.all([
      dataRegistry.getData('apmTraceOverviewByTraceId', {
        request,
        traceId,
        start: startMs,
        end: endMs,
      }),
      dataRegistry.getData('apmTraceErrorsByTraceId', {
        request,
        traceId,
        start: startMs,
        end: endMs,
      }),
      dataRegistry.getData('apmLogCategoriesByService', {
        request,
        serviceName,
        start,
        end,
      }),
    ]);

    if (traceOverview?.services?.length) {
      contextLines.push(
        `<TraceServices>\n${JSON.stringify(
          traceOverview.services.slice(0, 25),
          null,
          2
        )}\n</TraceServices>`
      );
    }

    if (traceOverview?.items?.length) {
      contextLines.push(
        `<TraceItems>\n${JSON.stringify(traceOverview.items.slice(0, 100), null, 2)}\n</TraceItems>`
      );
    }

    if (traceErrors?.length) {
      contextLines.push(
        `<TraceErrors>\n${JSON.stringify(traceErrors.slice(0, 100), null, 2)}\n</TraceErrors>`
      );
    }

    if (logCategories?.length) {
      contextLines.push(
        `<LogCategories service="${serviceName}">\n${JSON.stringify(
          logCategories.slice(0, 10),
          null,
          2
        )}\n</LogCategories>`
      );
    }
  }

  if (downstreamDependencies.length > 0) {
    const deps = downstreamDependencies
      .slice(0, 5)
      .map((d) => d['span.destination.service.resource'])
      .filter(Boolean)
      .join(', ');
    if (deps) {
      contextLines.push(`Downstream dependencies (sample): ${deps}`);
    }
  }

  return contextLines.filter(Boolean).join('\n');
}
