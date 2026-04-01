/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryScheduleCreateProps } from '@kbn/discoveries-schemas';
import { transformCreatePropsFromApi } from '.';

const defaultApiCreateProps: AttackDiscoveryScheduleCreateProps = {
  actions: [
    {
      action_type_id: '.email',
      group: 'default',
      id: 'action-1',
      params: { to: ['test@elastic.co'] },
      frequency: {
        notify_when: 'onActiveAlert',
        summary: true,
        throttle: null,
      },
    },
  ],
  enabled: true,
  name: 'Test Schedule',
  params: {
    alerts_index_pattern: '.alerts-security.alerts-default',
    api_config: {
      action_type_id: '.gen-ai',
      connector_id: 'gpt-4o',
      default_system_prompt_id: 'prompt-1',
      model: 'gpt-4o',
      name: 'Mock GPT-4o',
      provider: 'OpenAI',
    },
    combined_filter: { bool: {} },
    end: 'now',
    filters: [],
    query: { language: 'kuery', query: '' },
    size: 100,
    start: 'now-24h',
  },
  schedule: { interval: '10m' },
};

describe('transformCreatePropsFromApi', () => {
  it('transforms all fields correctly', () => {
    const result = transformCreatePropsFromApi(defaultApiCreateProps);

    expect(result).toEqual({
      actions: [
        {
          actionTypeId: '.email',
          alertsFilter: undefined,
          frequency: {
            notifyWhen: 'onActiveAlert',
            summary: true,
            throttle: null,
          },
          group: 'default',
          id: 'action-1',
          params: { to: ['test@elastic.co'] },
          uuid: undefined,
        },
      ],
      enabled: true,
      name: 'Test Schedule',
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
        combinedFilter: { bool: {} },
        end: 'now',
        filters: [],
        query: { language: 'kuery', query: '' },
        size: 100,
        start: 'now-24h',
        workflowConfig: {
          alertRetrievalWorkflowIds: [],
          defaultAlertRetrievalMode: 'custom_query',
          validationWorkflowId: 'default',
        },
      },
      schedule: { interval: '10m' },
    });
  });

  it('handles missing optional fields', () => {
    const minimal: AttackDiscoveryScheduleCreateProps = {
      name: 'Minimal',
      params: {
        alerts_index_pattern: '.alerts-*',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'c1',
        },
        size: 50,
      },
      schedule: { interval: '1h' },
    };

    const result = transformCreatePropsFromApi(minimal);

    expect(result.params.apiConfig.defaultSystemPromptId).toBeUndefined();
    expect(result.params.apiConfig.model).toBeUndefined();
    expect(result.params.apiConfig.name).toBe('');
    expect(result.params.end).toBeUndefined();
    expect(result.params.start).toBeUndefined();
    expect(result.actions).toBeUndefined();
    expect(result.enabled).toBeUndefined();
  });

  it('provides default workflowConfig when workflow_config is absent', () => {
    const result = transformCreatePropsFromApi(defaultApiCreateProps);

    expect(result.params.workflowConfig).toEqual({
      alertRetrievalWorkflowIds: [],
      defaultAlertRetrievalMode: 'custom_query',
      validationWorkflowId: 'default',
    });
  });

  it('transforms explicit workflow_config from the API', () => {
    const propsWithConfig: AttackDiscoveryScheduleCreateProps = {
      ...defaultApiCreateProps,
      params: {
        ...defaultApiCreateProps.params,
        workflow_config: {
          alert_retrieval_workflow_ids: ['wf-custom-1', 'wf-custom-2'],
          default_alert_retrieval_mode: 'disabled',
          validation_workflow_id: 'wf-custom-validate',
        },
      },
    };

    const result = transformCreatePropsFromApi(propsWithConfig);

    expect(result.params.workflowConfig).toEqual({
      alertRetrievalWorkflowIds: ['wf-custom-1', 'wf-custom-2'],
      defaultAlertRetrievalMode: 'disabled',
      validationWorkflowId: 'wf-custom-validate',
    });
  });
});
