/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import fetch from 'node-fetch';

export interface Event {
  eventName: string;
  eventType: string;
  journeyName: string;
  kibanaVersion: string;
  branch: string | undefined;
  ciBuildId: string | undefined;
  ciBuildJobId: string | undefined;
  ciBuildName: string | undefined;
  ciBuildNumber: number;
  gitRev: string | undefined;
  rpsAtSLA: number;
  rpsAtResponseTimeWarmupAvg: number;
  rpsAtResponseTime10XAvg: number;
  rpsAtResponseTime100XAvg: number;
  rpsAtRequestsToActiveUsers: number;
  thresholdSLA: number;
}

function eventsToNDJSON(events: Event[]): string {
  return `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;
}

function buildHeaders(clusterUuid: string, version: string) {
  return {
    'content-type': 'application/x-ndjson',
    'x-elastic-cluster-id': clusterUuid,
    'x-elastic-stack-version': version,
  };
}

export class EventsShipper {
  url: string;
  clusterUuid: string;
  version: string;
  log: ToolingLog;

  constructor(url: string, clusterUuid: string, version: string, log: ToolingLog) {
    this.url = url;
    this.clusterUuid = clusterUuid;
    this.version = version;
    this.log = log;
  }

  async send(events: Event[]) {
    const body = eventsToNDJSON(events);
    this.log.debug(`Sending telemetry data: ${JSON.stringify(eventsToNDJSON)}`);

    if (process.env.BUILDKITE_BUILD_ID) {
      const response = await fetch(this.url, {
        method: 'POST',
        body,
        headers: buildHeaders(this.clusterUuid, this.version),
      });

      if (!response.ok) {
        throw new Error(`Telemetry sending error: ${response.status} - ${await response.text()}`);
      }

      return `${response.status}`;
    }
  }
}
