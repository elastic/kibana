/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { DefendInsightsPostRequestBody } from '@kbn/elastic-assistant-common';
import moment from 'moment';

import type { BuildWorkflowInsightParams } from '.';

import {
  Category,
  SourceType,
  TargetType,
  ActionType,
} from '../../../../../common/endpoint/types/workflow_insights';
import { createMockEndpointAppContext } from '../../../mocks';
import type { EndpointMetadataService } from '../../metadata';
import { buildPolicyResponseFailureWorkflowInsights } from './policy_response_failure';

describe('buildPolicyResponseFailureWorkflowInsights', () => {
  const mockEndpointAppContextService = createMockEndpointAppContext().service;
  mockEndpointAppContextService.getEndpointMetadataService = jest.fn().mockReturnValue({
    getMetadataForEndpoints: jest.fn(),
  });
  const endpointMetadataService =
    mockEndpointAppContextService.getEndpointMetadataService() as jest.Mocked<EndpointMetadataService>;

  const generateParams = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defendInsights: any[] = [
      {
        group: 'Policy Response Failure',
        events: [
          {
            id: 'event-1',
            endpointId: 'endpoint-1',
            value: 'policy.response.failure',
          },
        ],
        remediation: {
          message: 'Policy response failed. Please check endpoint connectivity.',
        },
      },
    ]
  ): BuildWorkflowInsightParams => ({
    defendInsights,
    request: {
      body: {
        insightType: 'policy_response_failure',
        endpointIds: ['endpoint-1', 'endpoint-2'],
        apiConfig: {
          connectorId: 'connector-id-1',
          actionTypeId: 'action-type-id-1',
          model: 'gpt-4',
        },
        anonymizationFields: [],
        subAction: 'invokeAI',
      },
    } as unknown as KibanaRequest<unknown, unknown, DefendInsightsPostRequestBody>,
    endpointMetadataService,
    esClient: {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [],
        },
      }),
    } as unknown as ElasticsearchClient,
  });

  const buildExpectedInsight = (
    group: string,
    remediationMessage: string,
    remediationLink: string = ''
  ) =>
    expect.objectContaining({
      '@timestamp': expect.any(moment),
      message: 'Policy response failure detected',
      category: Category.Endpoint,
      type: 'policy_response_failure',
      source: {
        type: SourceType.LlmConnector,
        id: 'connector-id-1',
        data_range_start: expect.any(moment),
        data_range_end: expect.any(moment),
      },
      target: {
        type: TargetType.Endpoint,
        ids: ['endpoint-1', 'endpoint-2'],
      },
      action: {
        type: ActionType.Refreshed,
        timestamp: expect.any(moment),
      },
      value: group,
      metadata: {
        notes: {
          llm_model: 'gpt-4',
        },
        display_name: group,
      },
      remediation: {
        descriptive: remediationMessage,
        link: remediationLink,
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should correctly build workflow insights with valid remediation', async () => {
    const params = generateParams();
    const result = await buildPolicyResponseFailureWorkflowInsights(params);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      buildExpectedInsight(
        'Policy Response Failure',
        'Policy response failed. Please check endpoint connectivity.'
      )
    );
  });

  it('should handle multiple insights with remediation', async () => {
    const params = generateParams([
      {
        group: 'Policy Response Failure - Network',
        events: [
          {
            id: 'event-1',
            endpointId: 'endpoint-1',
            value: 'policy.response.network.failure',
          },
        ],
        remediation: {
          message: 'Network connectivity issues detected.',
        },
      },
      {
        group: 'Policy Response Failure - Authentication',
        events: [
          {
            id: 'event-2',
            endpointId: 'endpoint-2',
            value: 'policy.response.auth.failure',
          },
        ],
        remediation: {
          message: 'Authentication failed for policy response.',
        },
      },
    ]);

    const result = await buildPolicyResponseFailureWorkflowInsights(params);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      buildExpectedInsight(
        'Policy Response Failure - Network',
        'Network connectivity issues detected.'
      )
    );
    expect(result[1]).toEqual(
      buildExpectedInsight(
        'Policy Response Failure - Authentication',
        'Authentication failed for policy response.'
      )
    );
  });

  it('should filter out insights without remediation', async () => {
    const params = generateParams([
      {
        group: 'Valid Insight',
        events: [
          {
            id: 'event-1',
            endpointId: 'endpoint-1',
            value: 'valid.insight',
          },
        ],
        remediation: {
          message: 'This insight has remediation.',
        },
      },
      {
        group: 'Invalid Insight - No Remediation',
        events: [
          {
            id: 'event-2',
            endpointId: 'endpoint-2',
            value: 'invalid.insight',
          },
        ],
        // No remediation property
      },
    ]);

    const result = await buildPolicyResponseFailureWorkflowInsights(params);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      buildExpectedInsight('Valid Insight', 'This insight has remediation.')
    );
  });

  it('should filter out insights with remediation but no message', async () => {
    const params = generateParams([
      {
        group: 'Valid Insight',
        events: [
          {
            id: 'event-1',
            endpointId: 'endpoint-1',
            value: 'valid.insight',
          },
        ],
        remediation: {
          message: 'This insight has a message.',
        },
      },
      {
        group: 'Invalid Insight - No Message',
        events: [
          {
            id: 'event-2',
            endpointId: 'endpoint-2',
            value: 'invalid.insight',
          },
        ],
        remediation: {
          // No message property
        },
      },
    ]);

    const result = await buildPolicyResponseFailureWorkflowInsights(params);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(buildExpectedInsight('Valid Insight', 'This insight has a message.'));
  });

  it('should filter out insights with empty remediation message', async () => {
    const params = generateParams([
      {
        group: 'Valid Insight',
        events: [
          {
            id: 'event-1',
            endpointId: 'endpoint-1',
            value: 'valid.insight',
          },
        ],
        remediation: {
          message: 'This insight has a valid message.',
        },
      },
      {
        group: 'Invalid Insight - Empty Message',
        events: [
          {
            id: 'event-2',
            endpointId: 'endpoint-2',
            value: 'invalid.insight',
          },
        ],
        remediation: {
          message: '',
        },
      },
    ]);

    const result = await buildPolicyResponseFailureWorkflowInsights(params);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      buildExpectedInsight('Valid Insight', 'This insight has a valid message.')
    );
  });

  it('should return empty array when no insights have valid remediation', async () => {
    const params = generateParams([
      {
        group: 'No Remediation',
        events: [
          {
            id: 'event-1',
            endpointId: 'endpoint-1',
            value: 'no.remediation',
          },
        ],
        // No remediation
      },
      {
        group: 'Empty Remediation Message',
        events: [
          {
            id: 'event-2',
            endpointId: 'endpoint-2',
            value: 'empty.message',
          },
        ],
        remediation: {
          message: '',
        },
      },
    ]);

    const result = await buildPolicyResponseFailureWorkflowInsights(params);

    expect(result).toHaveLength(0);
  });

  it('should handle missing model in apiConfig', async () => {
    const params = generateParams();
    params.request.body.apiConfig.model = undefined;

    const result = await buildPolicyResponseFailureWorkflowInsights(params);

    expect(result).toHaveLength(1);
    expect(result[0].metadata?.notes?.llm_model).toBe('');
  });

  it('should use correct endpoint IDs from request body', async () => {
    const params = generateParams();
    params.request.body.endpointIds = ['endpoint-a', 'endpoint-b', 'endpoint-c'];

    const result = await buildPolicyResponseFailureWorkflowInsights(params);

    expect(result).toHaveLength(1);
    expect(result[0].target.ids).toEqual(['endpoint-a', 'endpoint-b', 'endpoint-c']);
  });

  it('should use correct connector ID from apiConfig', async () => {
    const params = generateParams();
    params.request.body.apiConfig.connectorId = 'custom-connector-id';

    const result = await buildPolicyResponseFailureWorkflowInsights(params);

    expect(result).toHaveLength(1);
    expect(result[0].source.id).toBe('custom-connector-id');
  });

  it('should use correct insight type from request body', async () => {
    const params = generateParams();
    params.request.body.insightType = 'policy_response_failure';

    const result = await buildPolicyResponseFailureWorkflowInsights(params);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('policy_response_failure');
  });
});
