/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import { streamIntoObservable } from '@kbn/observability-ai-assistant-plugin/server';
import { ToolingLog } from '@kbn/tooling-log';
import { concatMap, defer, lastValueFrom, switchMap, toArray, tap, OperatorFunction } from 'rxjs';
import {
  KibanaClient,
  type ChatClient,
} from '@kbn/observability-ai-assistant-app-plugin/scripts/evaluation/kibana_client';
import type { RootCauseAnalysisEvent } from '@kbn/observability-ai-server/root_cause_analysis';

// eslint-disable-next-line spaced-comment
/// <reference types="@kbn/ambient-ftr-types"/>

export type RCAChatClient = ChatClient & {
  rootCauseAnalysis: (params: { investigationId: string }) => Promise<RootCauseAnalysisEvent[]>;
  createInvestigation: () => Promise<string>;
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

    async function archiveData() {
      const apmIndexPattern = await getAPMIndexPattern();
      const alertingIndexPattern = '.alerts.internal.alerts-observability.*';
    }

    async function createInvestigation(): Promise<string> {
      const body = {
        id: uuidv4(),
        title: 'Investigate Custom threshold breached',
        params: {
          timeRange: {
            from: 1733862336557,
            to: 1733866296614,
          },
        },
        tags: [],
        origin: {
          type: 'alert',
          id: '689e9712-64d6-49e3-806f-0b74cb156148',
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
    }: {
      connectorIdOverride?: string;
      investigationId: string;
    }) {
      const chat$ = defer(() => {
        that.log.debug(`Calling chat API`);
        const body = {
          investigationId,
          connectorId: connectorIdOverride || '34002e09-65be-4332-9084-2649c86abacb',
          context:
            'The user is investigating an alert for the controller service,\n            and wants to find the root cause. Here is the alert:\n\n            {"kibana.alert.reason":"500 Errors is 98.46154, above the threshold of 1. (duration: 1 min, data view: otel_logs_data (Automated by Demo CLI), group: controller,/api/cart)","kibana.alert.evaluation.values":[98.46153846153847],"kibana.alert.evaluation.threshold":[1],"kibana.alert.group":[{"field":"service.name","value":"controller"},{"field":"url.path","value":"/api/cart"}],"tags":["demo","cli-created"],"service.name":"controller","kibana.alert.rule.category":"Custom threshold","kibana.alert.rule.consumer":"logs","kibana.alert.rule.name":"NGINX 500s","kibana.alert.rule.parameters":{"criteria":[{"comparator":">","metrics":[{"name":"A","filter":"http.response.status_code:*","aggType":"count"},{"name":"B","filter":"http.response.status_code>=500","aggType":"count"}],"threshold":[1],"timeSize":1,"timeUnit":"m","equation":"(B/A) * 100","label":"500 Errors"}],"alertOnNoData":false,"alertOnGroupDisappear":false,"searchConfiguration":{"query":{"query":"k8s.namespace.name: \\"ingress-nginx\\" AND url.path: /api/*","language":"kuery"},"index":"otel_logs_data"},"groupBy":["service.name","url.path"]},"kibana.alert.rule.producer":"observability","kibana.alert.rule.revision":0,"kibana.alert.rule.rule_type_id":"observability.rules.custom_threshold","kibana.alert.rule.tags":["demo","cli-created"],"kibana.alert.rule.uuid":"9055220c-8fb1-4f9f-be7c-0a33eb2bafc5","kibana.space_ids":["default"],"kibana.alert.action_group":"custom_threshold.fired","kibana.alert.flapping":false,"kibana.alert.instance.id":"controller,/api/cart","kibana.alert.maintenance_window_ids":[],"kibana.alert.consecutive_matches":5,"kibana.alert.status":"active","kibana.alert.uuid":"9e2bffb7-b13f-49a8-9f8d-36677f53854e","kibana.alert.workflow_status":"open","kibana.alert.duration.us":240627000,"kibana.alert.start":"2024-12-10T20:40:35.509Z","kibana.alert.time_range":{"gte":"2024-12-10T20:40:35.509Z"},"kibana.version":"9.0.0","kibana.alert.previous_action_group":"custom_threshold.fired"}',
          rangeFrom: '2024-12-10T20:20:35.509Z',
          rangeTo: '2024-12-10T20:44:36.465Z',
          serviceName: 'controller',
          completeInBackground: true,
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
        tap(() => {
          that.log.info(`Analyzing root cause...`);
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
      archiveData: async () => {
        return await archiveData();
      },
      createInvestigation: async () => {
        return await createInvestigation();
      },
      deleteInvestigation: async ({ investigationId }: { investigationId: string }) => {
        return deleteInvestigation({ investigationId });
      },
      rootCauseAnalysis: async ({ investigationId }: { investigationId: string }) => {
        return rootCauseAnalysis({ connectorIdOverride: connectorId, investigationId });
      },
    };
  }
}
