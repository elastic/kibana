/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { loggerMock } from '@kbn/logging-mocks';
import { ASSET_MISCONFIGURATIONS_TOOL } from './asset_misconfigurations_tool';
import type { AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common/impl/schemas';
import { newContentReferencesStoreMock } from '@kbn/elastic-assistant-common/impl/content_references/content_references_store/__mocks__/content_references_store.mock';

const mockEsClient = {
  search: jest.fn().mockResolvedValue({}),
} as unknown as ElasticsearchClient;

const mockRequest = {
  headers: {},
  body: {
    isEnabledKnowledgeBase: false,
    replacements: { key: 'value' },
  },
  query: {},
  params: {},
  route: { settings: {} },
  url: { href: '' },
  raw: { req: { url: '' } },
} as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;

const mockAnonymizationFields = [
  { id: '1', field: 'resource.id', allowed: true, anonymized: true },
  { id: '2', field: 'resource.name', allowed: true, anonymized: true },
  { id: '3', field: 'rule.name', allowed: true, anonymized: false },
  { id: '4', field: '@timestamp', allowed: true, anonymized: false },
];

const validParams: AssistantToolParams = {
  request: mockRequest,
  esClient: mockEsClient,
  logger: loggerMock.create(),
  contentReferencesStore: newContentReferencesStoreMock(),
  isEnabledKnowledgeBase: false,
  anonymizationFields: mockAnonymizationFields,
};

describe('ASSET_MISCONFIGURATIONS_TOOL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be supported with valid parameters', () => {
    const isSupported = ASSET_MISCONFIGURATIONS_TOOL.isSupported(validParams);
    expect(isSupported).toBe(true);
  });

  it('should not be supported without request parameter', () => {
    const paramsWithoutRequest = { ...validParams };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (paramsWithoutRequest as any).request;
    const isSupported = ASSET_MISCONFIGURATIONS_TOOL.isSupported(paramsWithoutRequest);
    expect(isSupported).toBe(false);
  });

  it('should return null when not supported', async () => {
    const paramsWithoutRequest = { ...validParams };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (paramsWithoutRequest as any).request;
    const tool = await ASSET_MISCONFIGURATIONS_TOOL.getTool(paramsWithoutRequest);
    expect(tool).toBeNull();
  });

  it('should return tool when supported', async () => {
    const tool = await ASSET_MISCONFIGURATIONS_TOOL.getTool(validParams);
    expect(tool).not.toBeNull();
    expect(tool?.name).toBe('AssetMisconfigurationsTool');
  });

  it('should execute search with correct parameters', async () => {
    const mockSearchResponse = {
      hits: {
        hits: [
          {
            fields: {
              rule: {
                name: 'Test Rule',
                description: 'Test Description',
                section: 'Test Section',
                tags: ['test-tag'],
                benchmark: {
                  name: 'CIS AWS',
                  id: 'cis_aws',
                  rule_number: '1.1',
                  version: '1.2.0',
                  posture_type: 'cspm',
                },
              },
              resource: {
                name: 'test-resource',
                type: 's3_bucket',
                sub_type: 'bucket',
              },
              result: {
                evaluation: 'failed',
                evidence: { test: 'evidence' },
              },
              '@timestamp': '2023-01-01T00:00:00Z',
            },
          },
        ],
      },
    };

    (mockEsClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

    const tool = await ASSET_MISCONFIGURATIONS_TOOL.getTool(validParams);
    expect(tool).not.toBeNull();

    const result = await tool?.invoke({ resource_id: 'test-resource-id' });
    const parsedResult = JSON.parse(result as string);

    expect(mockEsClient.search).toHaveBeenCalledWith({
      index: 'security_solution-*.misconfiguration_latest',
      size: 50,
      sort: [{ '@timestamp': { order: 'desc' } }],
      fields: [
        { field: 'resource.name', include_unmapped: true },
        { field: 'rule.name', include_unmapped: true },
        { field: '@timestamp', include_unmapped: true },
      ],
      query: {
        bool: {
          filter: [
            { term: { 'resource.id': 'test-resource-id' } },
            { term: { 'result.evaluation': 'failed' } },
            { range: { '@timestamp': { gte: 'now-26h', lte: 'now' } } },
          ],
        },
      },
    });

    expect(parsedResult).toEqual({
      resource_id: 'test-resource-id',
      findings_count: 1,
      findings: [expect.any(String)],
    });
  });

  it('should handle empty search results', async () => {
    const mockEmptyResponse = {
      hits: {
        hits: [],
      },
    };

    (mockEsClient.search as jest.Mock).mockResolvedValue(mockEmptyResponse);

    const tool = await ASSET_MISCONFIGURATIONS_TOOL.getTool(validParams);
    const result = await tool?.invoke({ resource_id: 'test-resource-id' });
    const parsedResult = JSON.parse(result as string);

    expect(parsedResult).toEqual({
      resource_id: 'test-resource-id',
      findings_count: 0,
      findings: [],
    });
  });

  it('should return error message when resource.id is denied', async () => {
    const paramsWithDeniedResourceId = {
      ...validParams,
      anonymizationFields: [
        { id: '1', field: 'resource.id', allowed: false, anonymized: true }, // Denied
        { id: '2', field: 'resource.name', allowed: true, anonymized: true },
      ],
    };

    const tool = await ASSET_MISCONFIGURATIONS_TOOL.getTool(paramsWithDeniedResourceId);
    const result = await tool?.invoke({ resource_id: 'test-resource-id' });

    expect(result).toBe(
      'The field resource.id is denied by the anonymization settings and cannot be used to query misconfigurations. Please modify the anonymization settings and try again.'
    );
    expect(mockEsClient.search).not.toHaveBeenCalled();
  });

  it('should be supported when anonymizationFields are provided', () => {
    const isSupported = ASSET_MISCONFIGURATIONS_TOOL.isSupported(validParams);
    expect(isSupported).toBe(true);
  });

  it('should not be supported when anonymizationFields are missing', () => {
    const paramsWithoutAnonymization = { ...validParams };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (paramsWithoutAnonymization as any).anonymizationFields;

    const isSupported = ASSET_MISCONFIGURATIONS_TOOL.isSupported(paramsWithoutAnonymization);
    expect(isSupported).toBe(false);
  });

  it('should not be supported when anonymizationFields are undefined', () => {
    const paramsWithUndefinedAnonymization = {
      ...validParams,
      anonymizationFields: undefined,
    };

    const isSupported = ASSET_MISCONFIGURATIONS_TOOL.isSupported(paramsWithUndefinedAnonymization);
    expect(isSupported).toBe(false);
  });

  it('should pass anonymizationFields to query function', async () => {
    const mockSearchResponse = {
      hits: {
        hits: [
          {
            fields: {
              'resource.name': ['test-resource'],
              'rule.name': ['Test Rule'],
            },
          },
        ],
      },
    };

    (mockEsClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

    const tool = await ASSET_MISCONFIGURATIONS_TOOL.getTool(validParams);
    await tool?.invoke({ resource_id: 'test-resource-id' });

    const searchCall = (mockEsClient.search as jest.Mock).mock.calls[0][0];
    expect(searchCall.fields).toEqual([
      { field: 'resource.name', include_unmapped: true },
      { field: 'rule.name', include_unmapped: true },
      { field: '@timestamp', include_unmapped: true },
    ]);
  });

  it('should use transformRawData for anonymization', async () => {
    const mockSearchResponse = {
      hits: {
        hits: [
          {
            fields: {
              'resource.name': ['sensitive-name'],
              'rule.name': ['Rule Name'],
              '@timestamp': ['2023-01-01T00:00:00Z'],
            },
          },
        ],
      },
    };

    (mockEsClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

    const tool = await ASSET_MISCONFIGURATIONS_TOOL.getTool(validParams);
    const result = await tool?.invoke({ resource_id: 'test-resource-id' });
    const parsedResult = JSON.parse(result as string);

    expect(parsedResult.findings_count).toBe(1);
    expect(parsedResult.findings[0]).toEqual(expect.any(String));
  });
});
