/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryScheduleUpdateProps } from '@kbn/discoveries-schemas';
import { transformUpdatePropsFromApi } from '.';

const defaultApiUpdateProps: AttackDiscoveryScheduleUpdateProps = {
  actions: [
    {
      action_type_id: '.slack',
      group: 'default',
      id: 'action-1',
      params: { message: 'alert fired' },
    },
  ],
  name: 'Updated Schedule',
  params: {
    alerts_index_pattern: '.alerts-security.alerts-default',
    api_config: {
      action_type_id: '.bedrock',
      connector_id: 'bedrock-1',
      model: 'claude-3',
      name: 'Mock Claude',
    },
    size: 200,
  },
  schedule: { interval: '30m' },
};

describe('transformUpdatePropsFromApi', () => {
  it('transforms all fields correctly', () => {
    const result = transformUpdatePropsFromApi(defaultApiUpdateProps);

    expect(result).toEqual({
      actions: [
        {
          actionTypeId: '.slack',
          alertsFilter: undefined,
          frequency: undefined,
          group: 'default',
          id: 'action-1',
          params: { message: 'alert fired' },
          uuid: undefined,
        },
      ],
      name: 'Updated Schedule',
      params: {
        alertsIndexPattern: '.alerts-security.alerts-default',
        apiConfig: {
          actionTypeId: '.bedrock',
          connectorId: 'bedrock-1',
          defaultSystemPromptId: undefined,
          model: 'claude-3',
          name: 'Mock Claude',
          provider: undefined,
        },
        combinedFilter: undefined,
        end: undefined,
        filters: undefined,
        query: undefined,
        size: 200,
        start: undefined,
        workflowConfig: undefined,
      },
      schedule: { interval: '30m' },
    });
  });

  it('transforms actions as an empty array when API actions are empty', () => {
    const propsWithEmptyActions: AttackDiscoveryScheduleUpdateProps = {
      ...defaultApiUpdateProps,
      actions: [],
    };

    const result = transformUpdatePropsFromApi(propsWithEmptyActions);

    expect(result.actions).toEqual([]);
  });

  it('returns undefined workflowConfig when workflow_config is absent and no existing config is provided', () => {
    const result = transformUpdatePropsFromApi(defaultApiUpdateProps);

    expect(result.params.workflowConfig).toBeUndefined();
  });

  it('preserves existing workflowConfig when workflow_config is absent from the request', () => {
    const existingWorkflowConfig = {
      alertRetrievalMode: 'esql' as const,
      alertRetrievalWorkflowIds: ['wf-existing-1'],
      validationWorkflowId: 'wf-existing-validate',
    };

    const result = transformUpdatePropsFromApi(defaultApiUpdateProps, existingWorkflowConfig);

    expect(result.params.workflowConfig).toEqual(existingWorkflowConfig);
  });

  it('uses explicit workflow_config from the request even when existing config is provided', () => {
    const existingWorkflowConfig = {
      alertRetrievalMode: 'esql' as const,
      alertRetrievalWorkflowIds: ['wf-existing-1'],
      validationWorkflowId: 'wf-existing-validate',
    };
    const propsWithConfig: AttackDiscoveryScheduleUpdateProps = {
      ...defaultApiUpdateProps,
      params: {
        ...defaultApiUpdateProps.params,
        workflow_config: {
          alert_retrieval_workflow_ids: ['wf-request-1'],
          alert_retrieval_mode: 'custom_only',
          validation_workflow_id: 'wf-request-validate',
        },
      },
    };

    const result = transformUpdatePropsFromApi(propsWithConfig, existingWorkflowConfig);

    expect(result.params.workflowConfig).toEqual({
      alertRetrievalWorkflowIds: ['wf-request-1'],
      alertRetrievalMode: 'custom_only',
      validationWorkflowId: 'wf-request-validate',
    });
  });

  it('does not inject DEFAULT_WORKFLOW_CONFIG when workflow_config is absent', () => {
    const result = transformUpdatePropsFromApi(defaultApiUpdateProps);

    expect(result.params.workflowConfig).not.toEqual({
      alertRetrievalMode: 'custom_query',
      alertRetrievalWorkflowIds: [],
      validationWorkflowId: 'default',
    });
  });

  it('transforms explicit workflow_config from the API', () => {
    const propsWithConfig: AttackDiscoveryScheduleUpdateProps = {
      ...defaultApiUpdateProps,
      params: {
        ...defaultApiUpdateProps.params,
        workflow_config: {
          alert_retrieval_workflow_ids: ['wf-custom-1'],
          alert_retrieval_mode: 'custom_only',
          validation_workflow_id: 'wf-custom-validate',
        },
      },
    };

    const result = transformUpdatePropsFromApi(propsWithConfig);

    expect(result.params.workflowConfig).toEqual({
      alertRetrievalWorkflowIds: ['wf-custom-1'],
      alertRetrievalMode: 'custom_only',
      validationWorkflowId: 'wf-custom-validate',
    });
  });
});
