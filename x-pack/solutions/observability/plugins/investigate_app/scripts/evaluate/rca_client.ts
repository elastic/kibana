/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable } from 'stream';
import { AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import datemath from '@kbn/datemath';
import { ToolingLog } from '@kbn/tooling-log';
import { CreateInvestigationResponse } from '@kbn/investigation-shared';
import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { defer, lastValueFrom, toArray } from 'rxjs';
import { KibanaClient } from '@kbn/observability-ai-assistant-app-plugin/scripts/evaluation/kibana_client';
import type { RootCauseAnalysisEvent } from '@kbn/observability-ai-server/root_cause_analysis';
import { getRCAContext } from '../../common/rca/llm_context';

export class RCAClient {
  constructor(protected readonly kibanaClient: KibanaClient, protected readonly log: ToolingLog) {}

  async getAlert(alertId: string): Promise<EcsFieldsResponse> {
    const response = await this.kibanaClient.callKibana<EcsFieldsResponse>('get', {
      pathname: '/internal/rac/alerts',
      query: {
        id: alertId,
      },
    });
    return response.data;
  }

  async getTimeRange({
    fromOffset = 'now-15m',
    toOffset = 'now+15m',
    alert,
  }: {
    fromOffset: string;
    toOffset: string;
    alert: EcsFieldsResponse;
  }) {
    const alertStart = alert['kibana.alert.start'] as string | undefined;
    if (!alertStart) {
      throw new Error(
        'Alert start time is missing from the alert data. Please double check your alert fixture.'
      );
    }
    const from = datemath.parse(fromOffset, { forceNow: new Date(alertStart) })?.valueOf()!;
    const to = datemath.parse(toOffset, { forceNow: new Date(alertStart) })?.valueOf()!;
    return {
      from,
      to,
    };
  }

  async createInvestigation({
    alertId,
    from,
    to,
  }: {
    alertId: string;
    from: number;
    to: number;
  }): Promise<string> {
    const body = {
      id: uuidv4(),
      title: 'Investigate Custom threshold breached',
      params: {
        timeRange: {
          from,
          to,
        },
      },
      tags: [],
      origin: {
        type: 'alert',
        id: alertId,
      },
      externalIncidentUrl: null,
    };

    const response = await this.kibanaClient.callKibana<CreateInvestigationResponse>(
      'post',
      {
        pathname: '/api/observability/investigations',
      },
      body
    );

    return response.data.id;
  }

  async deleteInvestigation({ investigationId }: { investigationId: string }): Promise<void> {
    await this.kibanaClient.callKibana('delete', {
      pathname: `/api/observability/investigations/${investigationId}`,
    });
  }

  async rootCauseAnalysis({
    connectorId,
    investigationId,
    from,
    to,
    alert,
  }: {
    connectorId: string;
    investigationId: string;
    from: string;
    to: string;
    alert?: EcsFieldsResponse;
  }) {
    this.log.debug(`Calling root cause analysis API`);
    const that = this;
    const serviceName = alert?.['service.name'] as string | undefined;
    if (!alert) {
      throw new Error(
        'Alert not found. Please ensure you have loaded test fixture data prior to running tests.'
      );
    }
    if (!serviceName) {
      throw new Error(
        'Service name is missing from the alert data. Please double check your alert fixture.'
      );
    }
    const context = getRCAContext(alert, serviceName);
    const body = {
      investigationId,
      connectorId,
      context,
      rangeFrom: from,
      rangeTo: to,
      serviceName: 'controller',
      completeInBackground: false,
    };

    const chat$ = defer(async () => {
      const response: AxiosResponse<Readable> = await this.kibanaClient.callKibana(
        'post',
        {
          pathname: '/internal/observability/investigation/root_cause_analysis',
        },
        body,
        { responseType: 'stream', timeout: NaN }
      );

      return {
        response: {
          body: new ReadableStream<Uint8Array>({
            start(controller) {
              response.data.on('data', (chunk: Buffer) => {
                that.log.info(`Analyzing root cause...`);
                controller.enqueue(chunk);
              });

              response.data.on('end', () => {
                that.log.info(`Root cause analysis completed`);
                controller.close();
              });

              response.data.on('error', (err: Error) => {
                that.log.error(`Error while analyzing root cause: ${err}`);
                controller.error(err);
              });
            },
          }),
        },
      };
    }).pipe(httpResponseIntoObservable(), toArray());

    const events = await lastValueFrom(chat$);

    return events.map((event) => event.event) as RootCauseAnalysisEvent[];
  }
}
