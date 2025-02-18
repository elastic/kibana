/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import type {
  RootCauseAnalysisEvent,
  EndProcessToolMessage,
  InvestigateEntityToolMessage,
  ObservationToolMessage,
  ToolErrorMessage,
} from '@kbn/observability-ai-server/root_cause_analysis';
import {
  chatClient,
  kibanaClient,
  logger,
} from '@kbn/observability-ai-assistant-app-plugin/scripts/evaluation/services';
import { RCAClient } from '../../rca_client';

type ToolCallMessage =
  | EndProcessToolMessage
  | InvestigateEntityToolMessage
  | ObservationToolMessage
  | ToolErrorMessage;

const ALERT_FIXTURE_ID = '0265d890-8d8d-4c7e-a5bd-a3951f79574e';

describe('Root cause analysis', () => {
  const investigations: string[] = [];
  const rcaChatClient = new RCAClient(kibanaClient, logger);
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
    const alert = await rcaChatClient.getAlert(ALERT_FIXTURE_ID);
    const connectorId = chatClient.getConnectorId();
    const { from, to } = await rcaChatClient.getTimeRange({
      fromOffset: 'now-15m',
      toOffset: 'now+15m',
      alert,
    });
    const investigationId = await rcaChatClient.createInvestigation({
      alertId: ALERT_FIXTURE_ID,
      from,
      to,
    });
    investigations.push(investigationId);
    const events = await rcaChatClient.rootCauseAnalysis({
      investigationId,
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      alert,
      connectorId,
    });
    const { report, entities, errors } = categorizeEvents(events);
    const prompt = `
    An investigation was performed by the Observability AI Assistant to identify the root cause of an alert for the controller service. Here is the alert:         
    
    ${JSON.stringify(alert)}

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

    const conversation = await chatClient.complete({ messages: prompt });

    await chatClient.evaluate(conversation, [
      'Effectively reflects the actual root cause in the report. The actual root cause of the system failure was a misconfiguration related to the `cartservice`. A bad container entrypoint was configured for the cart service, causing it to fail to start',
      'Analyzes the cartservice during the course of the investigation.',
      'Analyzes each entity only once.',
      'The Observability AI Assistant encountered 0 errors when attempting to analyze the system failure.',
    ]);
  });

  after(async () => {
    for (const investigationId of investigations) {
      await rcaChatClient.deleteInvestigation({ investigationId });
    }
  });
});
