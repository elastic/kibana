/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, generateShortId, log, timerange } from '@kbn/synthtrace-client';

interface EventMetadata {
  'service.name'?: string;
  'container.id'?: string;
  'host.name'?: string;
  'kubernetes.pod.name'?: string;
}

interface TimeWindow {
  start: number;
  end: number;
}

/**
 * Generates APM transactions with a single downstream Elasticsearch dependency,
 * mirroring the data the FTR `obs_alert_details_context` suite seeded.
 */
export const generateApmTraces = (
  { start, end }: TimeWindow,
  eventMetadata: EventMetadata & { 'service.name': string }
) => {
  const serviceInstance = apm
    .service({
      name: eventMetadata['service.name'],
      environment: 'production',
      agentName: 'java',
    })
    .instance('my-instance');

  return timerange(start, end)
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      serviceInstance
        .transaction({ transactionName: 'tx' })
        .timestamp(timestamp)
        .duration(10000)
        .defaults({ 'service.version': '1.0.0', ...eventMetadata })
        .outcome('success')
        .children(
          serviceInstance
            .span({
              spanName: 'GET apm-*/_search',
              spanType: 'db',
              spanSubtype: 'elasticsearch',
            })
            .duration(1000)
            .success()
            .destination('elasticsearch')
            .timestamp(timestamp)
        )
    );
};

/**
 * Generates error logs whose message encodes the most specific identifier
 * available (service name, container id, pod name or host name), matching the
 * FTR fixture so the log-categorization assertions stay valid.
 */
export const generateLogs = ({ start, end }: TimeWindow, eventMetadata: EventMetadata) => {
  const getMessage = () => {
    const msgPrefix = `Error message #${generateShortId()}`;

    if (eventMetadata['service.name']) {
      return `${msgPrefix} from service ${eventMetadata['service.name']}`;
    }

    if (eventMetadata['container.id']) {
      return `${msgPrefix} from container ${eventMetadata['container.id']}`;
    }

    if (eventMetadata['kubernetes.pod.name']) {
      return `${msgPrefix} from pod ${eventMetadata['kubernetes.pod.name']}`;
    }

    if (eventMetadata['host.name']) {
      return `${msgPrefix} from host ${eventMetadata['host.name']}`;
    }

    return msgPrefix;
  };

  return timerange(start, end)
    .interval('1m')
    .rate(1)
    .generator((timestamp) => [
      log
        .create()
        .message(getMessage())
        .logLevel('error')
        .defaults({
          'trace.id': generateShortId(),
          'agent.name': 'synth-agent',
          ...eventMetadata,
        })
        .timestamp(timestamp),
    ]);
};

export interface LogCategory {
  errorCategory: string;
  // The route casts the Elasticsearch `fields` response (always arrays) to
  // `string`, so at runtime `sampleMessage` is a single-element array. Model
  // both shapes and normalize in assertions via `getSampleMessage`.
  sampleMessage: string | string[];
  docCount: number;
}

export interface AlertContextItem {
  key: string;
  data: unknown;
}

export interface AlertDetailsContextResponse {
  alertContext: AlertContextItem[];
}

export const getLogCategories = (alertContext: AlertContextItem[]): LogCategory[] =>
  (alertContext.find(({ key }) => key === 'logCategories')?.data as LogCategory[]) ?? [];

export const getSampleMessage = (logCategory: LogCategory): string =>
  Array.isArray(logCategory.sampleMessage)
    ? logCategory.sampleMessage[0]
    : logCategory.sampleMessage;

export const getServiceSummary = (alertContext: AlertContextItem[]): AlertContextItem | undefined =>
  alertContext.find(({ key }) => key === 'serviceSummary');

export const getDownstreamDependencies = (
  alertContext: AlertContextItem[]
): Array<Record<string, unknown>> | undefined =>
  alertContext.find(({ key }) => key === 'downstreamDependencies')?.data as
    | Array<Record<string, unknown>>
    | undefined;

export const buildContextQuery = (params: Record<string, string>): string =>
  new URLSearchParams(params).toString();
