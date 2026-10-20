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

  it('does NOT carry workflowConfig (composite toggles are workflows-path only)', () => {
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
          alertRetrievalMode: 'custom_query' as const,
          alertRetrievalWorkflowIds: ['workflow-1', 'workflow-2'],
          alertRetrievalWorkflowsEnabled: true,
          defaultRetrievalEnabled: false,
          skillEnabled: true,
          validationWorkflowId: 'custom-validation',
        },
      },
      '.alert-*',
      {} as AIConnector,
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
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    expect(baseSchedule.params).not.toHaveProperty('type');
  });

  it('includes type but never workflowConfig even when workflowConfig is present', () => {
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
          alertRetrievalMode: 'custom_query' as const,
          alertRetrievalWorkflowIds: ['wf-1'],
          alertRetrievalWorkflowsEnabled: true,
          defaultRetrievalEnabled: false,
          skillEnabled: true,
          validationWorkflowId: 'default',
        },
      },
      '.alert-*',
      {} as AIConnector,
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    expect(baseSchedule.params).toEqual(
      expect.objectContaining({
        type: 'attack_discovery',
      })
    );
    expect(baseSchedule.params).not.toHaveProperty('workflowConfig');
  });

  it('omits model and provider from apiConfig when the connector has neither', () => {
    (getGenAiConfig as jest.Mock).mockReturnValue({ defaultModel: null });

    const baseSchedule = convertFormDataInBaseSchedule(
      {
        name: 'no model or provider',
        connectorId: 'connector-1',
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
      {
        actionTypeId: '.inference',
        id: 'connector-1',
        name: 'connector-1',
      } as unknown as AIConnector,
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    expect(baseSchedule.params.apiConfig).not.toHaveProperty('model');
    expect(baseSchedule.params.apiConfig).not.toHaveProperty('provider');
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

  it('omits model from api_config when the connector has no model', () => {
    (getGenAiConfig as jest.Mock).mockReturnValue({ defaultModel: null });

    const result = convertFormDataToWorkflowSchedule(
      {
        name: 'no model',
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
      { actionTypeId: '.inference', id: 'c1', name: 'c1' } as unknown as AIConnector,
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    expect(result.params.api_config).not.toHaveProperty('model');
  });

  it('omits provider from api_config when the connector has no provider', () => {
    (getGenAiConfig as jest.Mock).mockReturnValue({ defaultModel: null });

    const result = convertFormDataToWorkflowSchedule(
      {
        name: 'no provider',
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
      {
        actionTypeId: '.inference',
        id: 'c1',
        name: 'c1',
        apiProvider: null,
      } as unknown as AIConnector,
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    expect(result.params.api_config).not.toHaveProperty('provider');
  });

  it('emits the composite workflow_config in snake_case when workflowConfig is present', () => {
    const result = convertFormDataToWorkflowSchedule(
      {
        name: 'composite',
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
        workflowConfig: {
          alertRetrievalMode: 'esql',
          alertRetrievalWorkflowIds: ['wf-1', 'wf-2'],
          alertRetrievalWorkflowsEnabled: true,
          defaultRetrievalEnabled: true,
          esqlQuery: 'FROM .alerts-security.alerts-default',
          skillEnabled: false,
          validationWorkflowId: 'custom-validate',
        },
      },
      '.alert-*',
      { actionTypeId: '.gen-ai', id: 'c1', apiProvider: 'openai' } as unknown as AIConnector,
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    expect(result.params.workflow_config).toEqual({
      alert_retrieval_mode: 'esql',
      alert_retrieval_workflow_ids: ['wf-1', 'wf-2'],
      alert_retrieval_workflows_enabled: true,
      default_retrieval_enabled: true,
      esql_query: 'FROM .alerts-security.alerts-default',
      skill_enabled: false,
      validation_workflow_id: 'custom-validate',
    });
  });

  it('adds workflow_config on conversion while preserving all unrelated schedule fields (1.0 → 2.0 on mutation)', () => {
    // Represents a legacy (1.0) schedule being edited/saved through the 2.0 workflow
    // path: it must GAIN workflow_config without losing name/interval/actions/api_config.
    const result = convertFormDataToWorkflowSchedule(
      {
        name: 'legacy schedule being converted',
        connectorId: 'c1',
        alertsSelectionSettings: {
          end: 'now',
          filters: [],
          query: { query: 'host.name: *', language: 'kuery' },
          size: 42,
          start: 'now-24h',
        },
        interval: '30m',
        actions: [
          {
            actionTypeId: '.slack',
            group: 'default',
            id: 'connector-123',
            params: { message: 'hi' },
            uuid: 'action-uuid',
          } as RuleAction,
        ],
        workflowConfig: {
          alertRetrievalMode: 'custom_query',
          alertRetrievalWorkflowIds: [],
          alertRetrievalWorkflowsEnabled: false,
          defaultRetrievalEnabled: true,
          skillEnabled: true,
          validationWorkflowId: 'default',
        },
      },
      '.alert-*',
      {
        actionTypeId: '.gen-ai',
        id: 'c1',
        name: 'c1',
        apiProvider: 'openai',
      } as unknown as AIConnector,
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    // Unrelated fields preserved
    expect(result.name).toBe('legacy schedule being converted');
    expect(result.schedule).toEqual({ interval: '30m' });
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]).toEqual(expect.objectContaining({ id: 'connector-123' }));
    expect(result.params.api_config).toEqual(expect.objectContaining({ connector_id: 'c1' }));
    expect(result.params.size).toBe(42);
    expect(result.params.query).toEqual({ query: 'host.name: *', language: 'kuery' });

    // AND the 2.0 discriminator is added
    expect(result.params.workflow_config).toEqual(
      expect.objectContaining({ default_retrieval_enabled: true, skill_enabled: true })
    );
  });

  it('does not include workflow_config when workflowConfig is undefined', () => {
    const result = convertFormDataToWorkflowSchedule(
      {
        name: 'no composite',
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
      { get: jest.fn() } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );

    expect(result.params).not.toHaveProperty('workflow_config');
  });
});
