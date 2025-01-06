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
import { streamIntoObservable } from '@kbn/observability-ai-assistant-plugin/server';
import { ToolingLog } from '@kbn/tooling-log';
import { concatMap, defer, lastValueFrom, switchMap, toArray, tap, OperatorFunction } from 'rxjs';
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
  getTimeRange: (params: {
    alert: EcsFieldsResponse;
    fromOffset: string;
    toOffset: string;
  }) => Promise<{ from: number; to: number }>;
  createInvestigation: (params: { alertId: string; from: number; to: number }) => Promise<string>;
  deleteInvestigation: (params: { investigationId: string }) => Promise<void>;
  archiveData: () => Promise<void>;
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

    async function getAPMIndexPattern(): Promise<string> {
      const response = await that.axios.get(
        that.getUrl({
          pathname: '/internal/apm/settings/apm-indices',
        })
      );
      const apmIndices = response.data;
      const apmIndexPattern = Object.values(apmIndices).join(',');
      return apmIndexPattern;
    }

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
      fromOffset,
      toOffset,
      alert,
    }: {
      fromOffset: string;
      toOffset: string;
      alert: EcsFieldsResponse;
    }) {
      const alertStart = alert['kibana.alert.start'];
      const from = datemath.parse(fromOffset, { forceNow: new Date(alertStart) }).valueOf();
      const to = datemath.parse(toOffset, { forceNow: new Date(alertStart) }).valueOf();
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
      alert: EcsFieldsResponse;
    }) {
      const chat$ = defer(() => {
        that.log.debug(`Calling chat API`);
        const serviceName = alert['service.name'];
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

        return that.axios.post(
          that.getUrl({
            pathname: '/internal/observability/investigation/root_cause_analysis',
          }),
          body,
          { responseType: 'stream', timeout: NaN }
        );
      }).pipe(
        switchMap((response) => streamIntoObservable(response.data)),
        serializeRCAResponse(),
        tap((event) => {
          switch (true) {
            case event.includes('"name":"endProcessAndWriteReport"'):
              that.log.info(`Root cause analysis completed.`);
              break;
            case event.includes('"name":"observe"'):
              that.log.info(`Observing...`);
              break;
            case event.includes('"name":"error"'):
              that.log.error(`Encountered an error!`);
              break;
            case event.includes('"name":"investigateEntity"'):
              that.log.info(`Investigating entity...`);
              break;
            default:
              that.log.info(`Analyzing root cause...`);
              break;
          }
        }),
        toArray()
      );

      const message = await lastValueFrom(chat$);
      const eventString = message.join('');

      const events = extractEvents(eventString, []);

      return events;
    }

    function extractEvents(
      input: string,
      events: RootCauseAnalysisEvent[]
    ): RootCauseAnalysisEvent[] {
      for (let i = 0; i < input.length; i++) {
        // two JSON objects back to back
        if (input[i] === '}' && input[i + 1] === '{') {
          const firstObject = input.slice(0, i + 1);
          const rest = input.slice(i + 1);
          const parsedObject = JSON.parse(firstObject) as { event: RootCauseAnalysisEvent };
          return extractEvents(rest, [...events, parsedObject.event]);
        }
      }
      return [...events, (JSON.parse(input) as { event: RootCauseAnalysisEvent }).event];
    }

    function serializeRCAResponse(): OperatorFunction<Buffer, string> {
      return (source$) => {
        const processed$ = source$.pipe(
          concatMap((buffer: Buffer) =>
            buffer
              .toString('utf-8')
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .filter((line) => {
                const isKeepAliveRegex = /^: keep-alive/;
                const isEventRegex = /^event: /;
                const isKeepAlive = isKeepAliveRegex.test(line);
                const isEvent = isEventRegex.test(line);
                return !isKeepAlive && !isEvent;
              })
              .map((line) => {
                const parsedLine = line.replace('data:', '').trim();
                return parsedLine;
              })
          )
        );

        return processed$;
      };
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
        from: string;
        to: string;
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
