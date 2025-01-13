/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import datemath from '@kbn/datemath';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { ToolingLog } from '@kbn/tooling-log';
import { defer, lastValueFrom, toArray } from 'rxjs';
import {
  KibanaClient,
  type ChatClient,
} from '@kbn/observability-ai-assistant-app-plugin/scripts/evaluation/kibana_client';
import type { RootCauseAnalysisEvent } from '@kbn/observability-ai-server/root_cause_analysis';
import { getRCAContext } from '../../common/rca/llm_context';

// eslint-disable-next-line spaced-comment
/// <reference types="@kbn/ambient-ftr-types"/>

export type RCAChatClient = ChatClient & {
  rootCauseAnalysis: (params: {
    investigationId: string;
    from: string;
    to: string;
    alert: EcsFieldsResponse;
  }) => Promise<RootCauseAnalysisEvent[]>;
  getAlert: (params: { alertId: string }) => Promise<EcsFieldsResponse>;
  getTimeRange: (params: {
    alert: EcsFieldsResponse;
    fromOffset: string;
    toOffset: string;
  }) => Promise<{ from: number; to: number }>;
  createInvestigation: (params: { alertId: string; from: number; to: number }) => Promise<string>;
  deleteInvestigation: (params: { investigationId: string }) => Promise<void>;
};

export class RCAKibanaClient extends KibanaClient {
  constructor(
    protected readonly log: ToolingLog,
    protected readonly url: string,
    protected readonly spaceId?: string
  ) {
    super(log, url, spaceId);
  }

  createChatClient({
    connectorId,
    evaluationConnectorId,
    persist,
    suite,
    scopes,
  }: {
    connectorId: string;
    evaluationConnectorId: string;
    persist: boolean;
    suite?: Mocha.Suite;
    scopes: AssistantScope[];
  }): RCAChatClient {
    const baseChatClient = super.createChatClient({
      connectorId,
      evaluationConnectorId,
      persist,
      suite,
      scopes,
    });
    const that = this;

    async function getAlert(alertId: string) {
      const response = await that.axios.get(
        that.getUrl({
          pathname: `/internal/rac/alerts`,
        }),
        {
          params: {
            id: alertId,
          },
        }
      );
      return response.data;
    }

    async function getTimeRange({
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

    async function createInvestigation({
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

      const response = await that.axios.post(
        that.getUrl({
          pathname: '/api/observability/investigations',
        }),
        body
      );
      return response.data.id;
    }

    async function deleteInvestigation({
      investigationId,
    }: Parameters<RCAChatClient['deleteInvestigation']>[0]) {
      await that.axios.delete(
        that.getUrl({
          pathname: `/api/observability/investigations/${investigationId}`,
        })
      );
    }

    async function rootCauseAnalysis({
      connectorIdOverride,
      investigationId,
      from,
      to,
      alert,
    }: {
      connectorIdOverride?: string;
      investigationId: string;
      from: string;
      to: string;
      alert?: EcsFieldsResponse;
    }) {
      that.log.debug(`Calling root cause analysis API`);
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
        connectorId: connectorIdOverride || '34002e09-65be-4332-9084-2649c86abacb',
        context,
        rangeFrom: from,
        rangeTo: to,
        serviceName: 'controller',
        completeInBackground: false,
      };

      const chat$ = defer(async () => {
        const response = await that.axios.post(
          that.getUrl({
            pathname: '/internal/observability/investigation/root_cause_analysis',
          }),
          body,
          { responseType: 'stream', timeout: NaN }
        );

        return {
          response: {
            body: new ReadableStream({
              start(controller) {
                response.data.on('data', (chunk) => {
                  controller.enqueue(chunk);
                });

                response.data.on('end', () => {
                  controller.close();
                });

                response.data.on('error', (err) => {
                  controller.error(err);
                });
              },
            }),
          },
        };
      }).pipe(httpResponseIntoObservable(), toArray());

      const events = await lastValueFrom(chat$);

      return events.map((event) => event.event);
    }

    return {
      ...baseChatClient,
      getAlert: async ({ alertId }: { alertId: string }) => {
        return await getAlert(alertId);
      },
      getTimeRange: async ({
        fromOffset,
        toOffset,
        alert,
      }: {
        fromOffset: string;
        toOffset: string;
        alert: EcsFieldsResponse;
      }) => {
        return await getTimeRange({ alert, fromOffset, toOffset });
      },
      createInvestigation: async ({
        alertId,
        from,
        to,
      }: {
        alertId: string;
        from: number;
        to: number;
      }) => {
        return await createInvestigation({ alertId, from, to });
      },
      deleteInvestigation: async ({ investigationId }: { investigationId: string }) => {
        return deleteInvestigation({ investigationId });
      },
      rootCauseAnalysis: async ({
        investigationId,
        from,
        to,
        alert,
      }: {
        investigationId: string;
        from: string;
        to: string;
        alert: EcsFieldsResponse;
      }) => {
        return rootCauseAnalysis({
          connectorIdOverride: connectorId,
          investigationId,
          from,
          to,
          alert,
        });
      },
    };
  }
}
