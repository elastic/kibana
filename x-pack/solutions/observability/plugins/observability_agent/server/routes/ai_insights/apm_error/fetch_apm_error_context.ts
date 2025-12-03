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
  const error =
    (await dataRegistry.getData('apmErrorById', {
      request,
      serviceName,
      serviceEnvironment: environment ?? '',
      start: parseDatemath(start),
      end: parseDatemath(end),
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
