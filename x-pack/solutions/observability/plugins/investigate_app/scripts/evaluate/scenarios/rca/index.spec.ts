/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

// import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
// import { RCA_SYSTEM_PROMPT_BASE } from '@kbn/observability-ai-assistant-server/root_cause_analysis/prompts';
import type {
  RootCauseAnalysisEvent,
  EndProcessToolMessage,
  InvestigateEntityToolMessage,
  ObservationToolMessage,
  ToolErrorMessage,
} from '@kbn/observability-ai-server/root_cause_analysis';
import { chatClient } from '@kbn/observability-ai-assistant-app-plugin/scripts/evaluation/services';
import type { RCAChatClient } from '../../kibana_client';

type ToolCallMessage =
  | EndProcessToolMessage
  | InvestigateEntityToolMessage
  | ObservationToolMessage
  | ToolErrorMessage;

describe('Root cause analysis', () => {
  const investigations: string[] = [];
  function countEntities(entities: InvestigateEntityToolMessage[]) {
    const entityCount: Record<string, number> = {};
    entities.forEach((entity) => {
      const name = entity.response.entity['service.name'];
      entityCount[name] = (entityCount[name] || 0) + 1;
    });
    return entityCount;
  }

  function categorizeEvents(events: RootCauseAnalysisEvent[]) {
    const report: EndProcessToolMessage[] = [];
    const observations: ObservationToolMessage[] = [];
    const errors: ToolErrorMessage[] = [];
    const entities: InvestigateEntityToolMessage[] = [];
    const other: RootCauseAnalysisEvent[] = [];
    const toolCallEvents = events.filter((event): event is ToolCallMessage => {
      const maybeToolEvent = event as EndProcessToolMessage;
      return (
        maybeToolEvent?.name === 'endProcessAndWriteReport' ||
        maybeToolEvent?.name === 'observe' ||
        maybeToolEvent?.name === 'error' ||
        maybeToolEvent?.name === 'investigateEntity'
      );
    });
    toolCallEvents.forEach((event) => {
      if (event.name) {
        switch (event.name) {
          case 'endProcessAndWriteReport':
            report.push(event as EndProcessToolMessage);
            break;
          case 'observe':
            observations.push(event as ObservationToolMessage);
            break;
          case 'error':
            errors.push(event as ToolErrorMessage);
            break;
          case 'investigateEntity':
            entities.push(event as InvestigateEntityToolMessage);
            break;
          default:
            other.push(event);
        }
      }
    });
    if (report.length > 1) {
      throw new Error('More than one final report found');
    }
    if (report.length === 0) {
      throw new Error('No final report found');
    }
    return { report: report[0], observations, errors, entities, other };
  }

  it('can accurately pinpoint the root cause of cartservice bad entrypoint failure', async () => {
    const rcaChatClient = chatClient as RCAChatClient;
    const investigationId = await rcaChatClient.createInvestigation();
    const response = await rcaChatClient.archiveData();
    investigations.push(investigationId);
    const events = await rcaChatClient.rootCauseAnalysis({ investigationId });
    const { report, entities, errors } = categorizeEvents(events);
    const prompt = `
    An investigation was performed by the Observability AI Assistant to identify the root cause of an alert for the controller service. Here is the alert:\n\n            {"kibana.alert.reason":"500 Errors is 98.48485, above the threshold of 1. (duration: 1 min, data view: otel_logs_data (Automated by Demo CLI), group: controller,/api/cart)","kibana.alert.evaluation.values":[98.48484848484848],"kibana.alert.evaluation.threshold":[1],"kibana.alert.group":[{"field":"service.name","value":"controller"},{"field":"url.path","value":"/api/cart"}],"tags":["demo","cli-created"],"service.name":"controller","kibana.alert.rule.category":"Custom threshold","kibana.alert.rule.consumer":"logs","kibana.alert.rule.name":"NGINX 500s","kibana.alert.rule.parameters":{"criteria":[{"comparator":">","metrics":[{"name":"A","filter":"http.response.status_code:*","aggType":"count"},{"name":"B","filter":"http.response.status_code>=500","aggType":"count"}],"threshold":[1],"timeSize":1,"timeUnit":"m","equation":"(B/A) * 100","label":"500 Errors"}],"alertOnNoData":false,"alertOnGroupDisappear":false,"searchConfiguration":{"query":{"query":"k8s.namespace.name: \\"ingress-nginx\\" AND url.path: /api/*","language":"kuery"},"index":"otel_logs_data"},"groupBy":["service.name","url.path"]},"kibana.alert.rule.producer":"observability","kibana.alert.rule.revision":0,"kibana.alert.rule.rule_type_id":"observability.rules.custom_threshold","kibana.alert.rule.tags":["demo","cli-created"],"kibana.alert.rule.uuid":"9055220c-8fb1-4f9f-be7c-0a33eb2bafc5","kibana.space_ids":["default"],"kibana.alert.action_group":"recovered","kibana.alert.flapping":false,"kibana.alert.instance.id":"controller,/api/cart","kibana.alert.maintenance_window_ids":[],"kibana.alert.consecutive_matches":0,"kibana.alert.status":"recovered","kibana.alert.uuid":"bac50489-3704-46a6-ba77-bf62bcd975ff","kibana.alert.workflow_status":"open","kibana.alert.duration.us":783515000,"kibana.alert.start":"2024-12-05T03:44:25.019Z","kibana.alert.time_range":{"gte":"2024-12-05T03:44:25.019Z","lte":"2024-12-05T03:57:28.534Z"},"kibana.version":"9.0.0","kibana.alert.previous_action_group":"custom_threshold.fired","kibana.alert.severity_improving":true,"kibana.alert.end":"2024-12-05T03:57:28.534Z"}

    The following entities were analyzed during the investigation.
    ${Object.entries(countEntities(entities))
      .map(([name, count]) => {
        return `    - ${name} (analyzed ${count} times)`;
      })
      .join('\n')}

    During the course of the investigation, the Observability AI Assistant encountered ${
      errors.length
    } errors when attempting to analyze the entities.${
      errors.length
        ? ' These errors were failures to retrieve data from the entities and do not reflect issues in the system being evaluated'
        : ''
    }.

    A report was written by the Observability AI Assistant detailing issues throughout the system, including the controller service and it's dependencies. The report includes a hypothesis about the underlying root cause of the system failure. Here is the report:

    ${report.response.report}
    `;

    const conversation = await chatClient.complete(prompt);

    await chatClient.evaluate(conversation, [
      'Effectively reflects the actual root cause in the report. The actual root cause of the system failure was a misconfiguration related to the `cartservice`. A bad container entrypoint was configured for the cart service, causing it to fail to start',
      'Analyzes the cart service during the course of the investigation.',
      'Analyzes each entity only once.',
      'The Observability AI Assistant encountered 0 errors when attempting to analyze the system failure.',
    ]);
  });

  after(async () => {
    const rcaChatClient = chatClient as RCAChatClient;
    for (const investigationId of investigations) {
      await rcaChatClient.deleteInvestigationItem({ investigationId });
    }
  });
});
