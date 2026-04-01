/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getScheduleMock } from '../../__mocks__/schedules.mock';
import { transformScheduleToApi } from '.';

describe('transformScheduleToApi', () => {
  it('transforms all fields correctly', () => {
    const mockSchedule = getScheduleMock();
    const result = transformScheduleToApi(mockSchedule);

    expect(result).toEqual({
      actions: [],
      created_at: '2025-03-31T09:57:42.194Z',
      created_by: 'elastic',
      enabled: false,
      id: '31db8de1-65f2-4da2-a3e6-d15d9931817e',
      last_execution: undefined,
      name: 'Test Schedule',
      params: {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'gpt-4o',
          default_system_prompt_id: undefined,
          model: undefined,
          name: 'Mock GPT-4o',
          provider: undefined,
        },
        combined_filter: undefined,
        end: 'now',
        filters: undefined,
        query: undefined,
        size: 100,
        start: 'now-24h',
      },
      schedule: { interval: '10m' },
      updated_at: '2025-03-31T09:57:42.194Z',
      updated_by: 'elastic',
    });
  });

  it('transforms a schedule with actions and last_execution', () => {
    const mockSchedule = getScheduleMock({
      actions: [
        {
          actionTypeId: '.email',
          group: 'default',
          id: 'action-1',
          params: { to: ['test@elastic.co'] },
          frequency: {
            notifyWhen: 'onActiveAlert',
            summary: true,
            throttle: null,
          },
        },
      ],
      lastExecution: {
        date: '2025-03-31T10:00:00.000Z',
        duration: 5000,
        status: 'ok',
      },
      params: {
        alertsIndexPattern: '.alerts-security.alerts-default',
        apiConfig: {
          actionTypeId: '.gen-ai',
          connectorId: 'gpt-4o',
          defaultSystemPromptId: 'prompt-1',
          model: 'gpt-4o',
          name: 'Mock GPT-4o',
          provider: 'OpenAI',
        },
        size: 100,
      },
    });

    const result = transformScheduleToApi(mockSchedule);

    expect(result.actions).toEqual([
      {
        action_type_id: '.email',
        alerts_filter: undefined,
        frequency: {
          notify_when: 'onActiveAlert',
          summary: true,
          throttle: null,
        },
        group: 'default',
        id: 'action-1',
        params: { to: ['test@elastic.co'] },
        uuid: undefined,
      },
    ]);
    expect(result.last_execution).toEqual({
      date: '2025-03-31T10:00:00.000Z',
      duration: 5000,
      status: 'ok',
    });
    expect(result.params.api_config).toEqual({
      action_type_id: '.gen-ai',
      connector_id: 'gpt-4o',
      default_system_prompt_id: 'prompt-1',
      model: 'gpt-4o',
      name: 'Mock GPT-4o',
      provider: 'OpenAI',
    });
  });

  it('includes workflow_config when workflowConfig is present', () => {
    const mockSchedule = getScheduleMock({
      params: {
        alertsIndexPattern: '.alerts-security.alerts-default',
        apiConfig: {
          actionTypeId: '.gen-ai',
          connectorId: 'gpt-4o',
          name: 'Mock GPT-4o',
        },
        size: 100,
        workflowConfig: {
          alertRetrievalWorkflowIds: ['workflow-1', 'workflow-2'],
          defaultAlertRetrievalMode: 'disabled',
          validationWorkflowId: 'custom-validation',
        },
      },
    });

    const result = transformScheduleToApi(mockSchedule);

    expect(result.params.workflow_config).toEqual({
      alert_retrieval_workflow_ids: ['workflow-1', 'workflow-2'],
      default_alert_retrieval_mode: 'disabled',
      validation_workflow_id: 'custom-validation',
    });
  });

  it('sets workflow_config to undefined when workflowConfig is not present', () => {
    const mockSchedule = getScheduleMock();
    const result = transformScheduleToApi(mockSchedule);

    expect(result.params.workflow_config).toBeUndefined();
  });
});
