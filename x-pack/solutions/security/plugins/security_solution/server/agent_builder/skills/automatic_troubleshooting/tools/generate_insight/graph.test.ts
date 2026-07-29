/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools';

import { WorkflowInsightType } from '../../../../../../common/endpoint/types/workflow_insights';
import { securityWorkflowInsightsService } from '../../../../../endpoint/services';
import { getPolicyResponseFailureEvents } from './refetch_policy_response_failures';
import { createGenerateInsightGraph } from './graph';

jest.mock('../../../../../endpoint/services', () => ({
  securityWorkflowInsightsService: {
    createFromDefendInsights: jest.fn(),
  },
}));

jest.mock('./refetch_policy_response_failures', () => ({
  getPolicyResponseFailureEvents: jest.fn(),
}));

const mockCreateFromDefendInsights =
  securityWorkflowInsightsService.createFromDefendInsights as jest.Mock;
const mockGetPolicyResponseFailureEvents = getPolicyResponseFailureEvents as jest.Mock;

interface ModelMock {
  model: ScopedModel;
  categorizeInvoke: jest.Mock;
  generateInvoke: jest.Mock;
  withStructuredOutput: jest.Mock;
}

const createModel = ({
  insightType,
  insights,
}: {
  insightType: WorkflowInsightType;
  insights: unknown[];
}): ModelMock => {
  const categorizeInvoke = jest.fn().mockResolvedValue({ insightType });
  const generateInvoke = jest.fn().mockResolvedValue({ insights });
  const withStructuredOutput = jest
    .fn()
    .mockReturnValueOnce({ invoke: categorizeInvoke })
    .mockReturnValueOnce({ invoke: generateInvoke });

  const model = {
    chatModel: {
      name: 'model-name',
      withStructuredOutput,
    },
    connector: {
      connectorId: 'connector-id',
    },
  } as unknown as ScopedModel;

  return { model, categorizeInvoke, generateInvoke, withStructuredOutput };
};

const esClient = {} as unknown as ElasticsearchClient;

const buildGraph = (
  model: ScopedModel,
  overrides: Partial<{ data: unknown[]; ccsEnabled: boolean }> = {}
) =>
  createGenerateInsightGraph({
    model,
    problemDescription: 'ransomware protection disabled on host',
    remediation: 'investigate the diagnostic action',
    endpointIds: ['endpoint-1'],
    data: overrides.data ?? [{ some: 'model-supplied doc' }],
    spaceId: 'space-1',
    esClient,
    ccsEnabled: overrides.ccsEnabled ?? false,
  });

describe('createGenerateInsightGraph', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the active space ID when creating workflow insights', async () => {
    const defendInsights = [
      {
        group: 'TestAV',
        events: [{ id: 'event-1', endpointId: 'endpoint-1', value: '/path/to/process' }],
      },
    ];
    const workflowInsights = [{ id: 'workflow-insight-1' }];
    const { model } = createModel({
      insightType: WorkflowInsightType.enum.incompatible_antivirus,
      insights: defendInsights,
    });
    mockCreateFromDefendInsights.mockResolvedValueOnce(workflowInsights);

    const graph = buildGraph(model);
    const result = await graph.invoke({});

    expect(mockCreateFromDefendInsights).toHaveBeenCalledWith(
      defendInsights,
      ['endpoint-1'],
      WorkflowInsightType.enum.incompatible_antivirus,
      'connector-id',
      'model-name',
      'space-1'
    );
    expect(result.results).toEqual([
      {
        type: ToolResultType.other,
        data: { workflowInsights },
      },
    ]);
  });

  describe('policy_response_failure gate', () => {
    it('does not generate or persist an insight when the refetch is all-success', async () => {
      mockGetPolicyResponseFailureEvents.mockResolvedValueOnce([]);
      const { model, generateInvoke, withStructuredOutput } = createModel({
        insightType: WorkflowInsightType.enum.policy_response_failure,
        insights: [{ group: 'should-not-be-used', events: [{ id: 'x' }] }],
      });

      const graph = buildGraph(model);
      const result = await graph.invoke({});

      expect(mockGetPolicyResponseFailureEvents).toHaveBeenCalledWith(esClient, {
        endpointIds: ['endpoint-1'],
        ccsEnabled: false,
      });
      expect(generateInvoke).not.toHaveBeenCalled();
      expect(withStructuredOutput).toHaveBeenCalledTimes(1);
      expect(mockCreateFromDefendInsights).not.toHaveBeenCalled();
      expect(result.results).toEqual([]);
    });

    it('passes ccsEnabled through to the refetch', async () => {
      mockGetPolicyResponseFailureEvents.mockResolvedValueOnce([]);
      const { model } = createModel({
        insightType: WorkflowInsightType.enum.policy_response_failure,
        insights: [],
      });

      const graph = buildGraph(model, { ccsEnabled: true });
      await graph.invoke({});

      expect(mockGetPolicyResponseFailureEvents).toHaveBeenCalledWith(esClient, {
        endpointIds: ['endpoint-1'],
        ccsEnabled: true,
      });
    });

    it('generates from the refetched failure/warning evidence, not the model-supplied data', async () => {
      const refetched = [
        {
          _id: ['policy-doc-1'],
          'agent.id': ['endpoint-1'],
          'host.os.name': ['Windows'],
          'actions.name': ['configure_malware'],
          'actions.message': ['Failed to configure malware protection'],
          'actions.status': ['failure'],
        },
      ];
      const defendInsights = [
        {
          group: 'configure_malware:::Failed to configure malware protection:::Windows',
          events: [{ id: 'policy-doc-1', endpointId: 'endpoint-1', value: 'failure' }],
          remediation: { message: 'Reapply the policy', link: '' },
        },
      ];
      const workflowInsights = [{ id: 'wi-1' }];
      mockGetPolicyResponseFailureEvents.mockResolvedValueOnce(refetched);
      mockCreateFromDefendInsights.mockResolvedValueOnce(workflowInsights);
      const { model, generateInvoke } = createModel({
        insightType: WorkflowInsightType.enum.policy_response_failure,
        insights: defendInsights,
      });

      const graph = buildGraph(model, { data: [{ misleading: 'success doc' }] });
      const result = await graph.invoke({});

      expect(generateInvoke).toHaveBeenCalledTimes(1);
      const generatePrompt = generateInvoke.mock.calls[0][0] as string;
      expect(generatePrompt).toContain('Failed to configure malware protection');
      expect(generatePrompt).toContain('policy-doc-1');
      expect(generatePrompt).not.toContain('misleading');
      expect(mockCreateFromDefendInsights).toHaveBeenCalledWith(
        defendInsights,
        ['endpoint-1'],
        WorkflowInsightType.enum.policy_response_failure,
        'connector-id',
        'model-name',
        'space-1'
      );
      expect(result.results).toEqual([{ type: ToolResultType.other, data: { workflowInsights } }]);
    });

    it('returns no results when the refetch has failures but generation yields none', async () => {
      mockGetPolicyResponseFailureEvents.mockResolvedValueOnce([
        {
          _id: ['policy-doc-1'],
          'agent.id': ['endpoint-1'],
          'host.os.name': ['Windows'],
          'actions.name': ['configure_malware'],
          'actions.message': ['Failed to configure malware protection'],
          'actions.status': ['failure'],
        },
      ]);
      const { model, generateInvoke } = createModel({
        insightType: WorkflowInsightType.enum.policy_response_failure,
        insights: [{ group: 'no-events', events: [] }],
      });

      const graph = buildGraph(model);
      const result = await graph.invoke({});

      expect(generateInvoke).toHaveBeenCalledTimes(1);
      expect(mockCreateFromDefendInsights).not.toHaveBeenCalled();
      expect(result.results).toEqual([]);
    });
  });

  describe('non-policy_response_failure passthrough', () => {
    it('does not refetch and generates from the model-supplied data for custom insights', async () => {
      const defendInsights = [
        {
          group: 'custom-group',
          events: [{ id: 'e1', endpointId: 'endpoint-1', value: 'v' }],
          remediation: { message: 'do the thing' },
        },
      ];
      mockCreateFromDefendInsights.mockResolvedValueOnce([{ id: 'wi-custom' }]);
      const { model, generateInvoke } = createModel({
        insightType: WorkflowInsightType.enum.custom,
        insights: defendInsights,
      });

      const graph = buildGraph(model, { data: [{ unique: 'custom-model-doc' }] });
      const result = await graph.invoke({});

      expect(mockGetPolicyResponseFailureEvents).not.toHaveBeenCalled();
      const generatePrompt = generateInvoke.mock.calls[0][0] as string;
      expect(generatePrompt).toContain('custom-model-doc');
      expect(result.results).toEqual([
        { type: ToolResultType.other, data: { workflowInsights: [{ id: 'wi-custom' }] } },
      ]);
    });

    it('preserves the empty no-op behavior for non-PRF types with no insights', async () => {
      mockGetPolicyResponseFailureEvents.mockResolvedValue([]);
      const { model } = createModel({
        insightType: WorkflowInsightType.enum.custom,
        insights: [],
      });

      const graph = buildGraph(model);
      const result = await graph.invoke({});

      expect(mockGetPolicyResponseFailureEvents).not.toHaveBeenCalled();
      expect(mockCreateFromDefendInsights).not.toHaveBeenCalled();
      expect(result.results).toEqual([]);
    });
  });
});
