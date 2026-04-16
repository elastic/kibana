/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import type { AIConnector } from '@kbn/elastic-assistant';

import type { RuleAction, RuleSystemAction } from '@kbn/alerting-plugin/common';

import {
  convertActionsToSnakeCase,
  convertFormDataInBaseSchedule,
  convertFormDataToWorkflowSchedule,
} from './convert_form_data';
import { convertToBuildEsQuery } from '../../../../../common/lib/kuery';
import { getGenAiConfig } from '../../../use_attack_discovery/helpers';
import { parseFilterQuery } from '../../parse_filter_query';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

jest.mock('../../../../../common/lib/kuery');
jest.mock('../../../use_attack_discovery/helpers');
jest.mock('../../parse_filter_query');

describe('convertFormDataInBaseSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (convertToBuildEsQuery as jest.Mock).mockReturnValue(['test-filter-query']);
    (getGenAiConfig as jest.Mock).mockReturnValue({ defaultModel: 'test-model' });
    (parseFilterQuery as jest.Mock).mockReturnValue({ filter: { field: 'test' } });
  });

  it('should convert form data into a base schedule schema', () => {
    const baseSchedule = convertFormDataInBaseSchedule(
      {
        name: 'test 1',
        connectorId: 'connector 1',
        alertsSelectionSettings: {
          end: 'now-5s',
          filters: [],
          query: {
            query: 'test: exists',
            language: 'kuery',
          },
          size: 145,
          start: 'now-99m',
        },
        interval: '23m',
        actions: [],
      },
      '.alert-*',
      {} as AIConnector,
      {
        get: jest.fn(),
      } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );
    expect(baseSchedule).toEqual({
      actions: [],
      enabled: true,
      name: 'test 1',
      params: {
        alertsIndexPattern: '.alert-*',
        apiConfig: { model: 'test-model' },
        combinedFilter: { filter: { field: 'test' } },
        end: 'now-5s',
        filters: [],
        query: { language: 'kuery', query: 'test: exists' },
        size: 145,
        start: 'now-99m',
      },
      schedule: { interval: '23m' },
    });
  });

  it('includes workflow_config in snake_case when workflowConfig is present', () => {
    const baseSchedule = convertFormDataInBaseSchedule(
      {
        name: 'workflow test',
        connectorId: 'connector 1',
        alertsSelectionSettings: {
          end: 'now',
          filters: [],
          query: { query: '', language: 'kuery' },
          size: 100,
          start: 'now-24h',
        },
        interval: '10m',
        actions: [],
        workflowConfig: {
          alertRetrievalWorkflowIds: ['workflow-1', 'workflow-2'],
          alertRetrievalMode: 'custom_only' as const,
          validationWorkflowId: 'custom-validation',
        },
      },
      '.alert-*',
      {} as AIConnector,
      {} as DataViewSpec,
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    expect(baseSchedule.params).toEqual(
      expect.objectContaining({
        workflowConfig: {
          alert_retrieval_workflow_ids: ['workflow-1', 'workflow-2'],
          alert_retrieval_mode: 'custom_only',
          validation_workflow_id: 'custom-validation',
        },
      })
    );
  });

  it('does not include workflow_config when workflowConfig is undefined', () => {
    const baseSchedule = convertFormDataInBaseSchedule(
      {
        name: 'no workflow',
        connectorId: 'connector 1',
        alertsSelectionSettings: {
          end: 'now',
          filters: [],
          query: { query: '', language: 'kuery' },
          size: 100,
          start: 'now-24h',
        },
        interval: '10m',
        actions: [],
      },
      '.alert-*',
      {} as AIConnector,
      {} as DataViewSpec,
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    expect(baseSchedule.params).not.toHaveProperty('workflowConfig');
  });

  it('includes the type field when type is present', () => {
    const baseSchedule = convertFormDataInBaseSchedule(
      {
        name: 'typed schedule',
        connectorId: 'connector 1',
        alertsSelectionSettings: {
          end: 'now',
          filters: [],
          query: { query: '', language: 'kuery' },
          size: 100,
          start: 'now-24h',
        },
        interval: '10m',
        actions: [],
        type: 'attack_discovery',
      },
      '.alert-*',
      {} as AIConnector,
      {} as DataViewSpec,
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    expect(baseSchedule.params).toEqual(
      expect.objectContaining({
        type: 'attack_discovery',
      })
    );
  });

  it('does not include type when type is undefined', () => {
    const baseSchedule = convertFormDataInBaseSchedule(
      {
        name: 'no type',
        connectorId: 'connector 1',
        alertsSelectionSettings: {
          end: 'now',
          filters: [],
          query: { query: '', language: 'kuery' },
          size: 100,
          start: 'now-24h',
        },
        interval: '10m',
        actions: [],
      },
      '.alert-*',
      {} as AIConnector,
      {} as DataViewSpec,
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    expect(baseSchedule.params).not.toHaveProperty('type');
  });

  it('includes both workflow_config and type when both are present', () => {
    const baseSchedule = convertFormDataInBaseSchedule(
      {
        name: 'full workflow schedule',
        connectorId: 'connector 1',
        alertsSelectionSettings: {
          end: 'now',
          filters: [],
          query: { query: '', language: 'kuery' },
          size: 100,
          start: 'now-24h',
        },
        interval: '10m',
        actions: [],
        type: 'attack_discovery',
        workflowConfig: {
          alertRetrievalWorkflowIds: ['wf-1'],
          alertRetrievalMode: 'custom_query' as const,
          validationWorkflowId: 'default',
        },
      },
      '.alert-*',
      {} as AIConnector,
      {} as DataViewSpec,
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    expect(baseSchedule.params).toEqual(
      expect.objectContaining({
        type: 'attack_discovery',
        workflowConfig: {
          alert_retrieval_workflow_ids: ['wf-1'],
          alert_retrieval_mode: 'custom_query',
          validation_workflow_id: 'default',
        },
      })
    );
  });

  it('does NOT include type or workflowConfig in params when both are absent (pre-workflow form data)', () => {
    const baseSchedule = convertFormDataInBaseSchedule(
      {
        name: 'pre-workflow-schedule',
        connectorId: 'connector-1',
        alertsSelectionSettings: {
          end: 'now',
          filters: [],
          query: { query: 'host.name: *', language: 'kuery' },
          size: 50,
          start: 'now-1h',
        },
        interval: '30m',
        actions: [],
      },
      '.alerts-security.alerts-default',
      {} as AIConnector,
      {} as DataViewSpec,
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    expect(baseSchedule.params).not.toHaveProperty('type');
    expect(baseSchedule.params).not.toHaveProperty('workflowConfig');
    expect(Object.keys(baseSchedule.params)).toEqual(
      expect.arrayContaining([
        'alertsIndexPattern',
        'apiConfig',
        'combinedFilter',
        'end',
        'filters',
        'query',
        'size',
        'start',
      ])
    );
  });
});

describe('convertActionsToSnakeCase', () => {
  it('converts a general action with frequency to snake_case', () => {
    const actions: Array<RuleAction | RuleSystemAction> = [
      {
        actionTypeId: '.index',
        group: 'default',
        id: 'connector-123',
        params: { documents: [{ test: true }] },
        uuid: 'action-uuid',
        frequency: {
          notifyWhen: 'onActiveAlert',
          summary: false,
          throttle: null,
        },
      } as RuleAction,
    ];

    const result = convertActionsToSnakeCase(actions);

    expect(result).toEqual([
      {
        action_type_id: '.index',
        frequency: {
          notify_when: 'onActiveAlert',
          summary: false,
          throttle: null,
        },
        group: 'default',
        id: 'connector-123',
        params: { documents: [{ test: true }] },
        uuid: 'action-uuid',
      },
    ]);
  });

  it('converts a general action without frequency', () => {
    const actions: Array<RuleAction | RuleSystemAction> = [
      {
        actionTypeId: '.index',
        group: 'default',
        id: 'connector-123',
        params: { documents: [{ test: true }] },
      } as RuleAction,
    ];

    const result = convertActionsToSnakeCase(actions);

    expect(result).toEqual([
      {
        action_type_id: '.index',
        group: 'default',
        id: 'connector-123',
        params: { documents: [{ test: true }] },
      },
    ]);
  });

  it('converts a system action to snake_case', () => {
    const actions: Array<RuleAction | RuleSystemAction> = [
      {
        actionTypeId: '.system-action',
        id: 'system-connector-123',
        params: { key: 'value' },
      } as RuleSystemAction,
    ];

    const result = convertActionsToSnakeCase(actions);

    expect(result).toEqual([
      {
        action_type_id: '.system-action',
        id: 'system-connector-123',
        params: { key: 'value' },
      },
    ]);
  });

  it('converts empty actions array', () => {
    expect(convertActionsToSnakeCase([])).toEqual([]);
  });
});

describe('convertFormDataToWorkflowSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (convertToBuildEsQuery as jest.Mock).mockReturnValue(['test-filter-query']);
    (getGenAiConfig as jest.Mock).mockReturnValue({ defaultModel: 'test-model' });
    (parseFilterQuery as jest.Mock).mockReturnValue({ filter: { field: 'test' } });
  });

  it('converts actions to snake_case in the output', () => {
    const result = convertFormDataToWorkflowSchedule(
      {
        name: 'workflow schedule',
        connectorId: 'connector-1',
        alertsSelectionSettings: {
          end: 'now',
          filters: [],
          query: { query: '', language: 'kuery' },
          size: 100,
          start: 'now-24h',
        },
        interval: '24h',
        actions: [
          {
            actionTypeId: '.index',
            group: 'default',
            id: 'index-connector-1',
            params: { documents: [{ summary: '{{context.attack.summary}}' }] },
            frequency: {
              notifyWhen: 'onActiveAlert',
              summary: false,
              throttle: null,
            },
          } as RuleAction,
        ],
      },
      '.alert-*',
      { actionTypeId: '.gen-ai', id: 'c1', apiProvider: 'openai' } as unknown as AIConnector,
      {} as DataViewSpec,
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    expect(result.actions).toEqual([
      {
        action_type_id: '.index',
        frequency: {
          notify_when: 'onActiveAlert',
          summary: false,
          throttle: null,
        },
        group: 'default',
        id: 'index-connector-1',
        params: { documents: [{ summary: '{{context.attack.summary}}' }] },
      },
    ]);
  });

  it('uses snake_case param keys', () => {
    const result = convertFormDataToWorkflowSchedule(
      {
        name: 'test',
        connectorId: 'c1',
        alertsSelectionSettings: {
          end: 'now',
          filters: [],
          query: { query: '', language: 'kuery' },
          size: 50,
          start: 'now-1h',
        },
        interval: '1h',
        actions: [],
      },
      '.alert-*',
      { actionTypeId: '.gen-ai', id: 'c1', apiProvider: 'openai' } as unknown as AIConnector,
      {} as DataViewSpec,
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    expect(result.params).toHaveProperty('alerts_index_pattern');
    expect(result.params).toHaveProperty('api_config');
    expect(result.params).toHaveProperty('combined_filter');
    expect(result.params).not.toHaveProperty('alertsIndexPattern');
    expect(result.params).not.toHaveProperty('apiConfig');
    expect(result.params).not.toHaveProperty('combinedFilter');
  });
});
