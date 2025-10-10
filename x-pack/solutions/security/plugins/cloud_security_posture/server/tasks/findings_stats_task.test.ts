/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { validateBenchmarkScoreTemplate } from './findings_stats_task';
import { createBenchmarkScoreIndex } from '../create_indices/create_indices';
import { benchmarkScoreMapping } from '../create_indices/benchmark_score_mapping';

jest.mock('../create_indices/create_indices', () => ({
  createBenchmarkScoreIndex: jest.fn(),
}));

const mockCreateBenchmarkScoreIndex = createBenchmarkScoreIndex as jest.MockedFunction<
  typeof createBenchmarkScoreIndex
>;

describe('validateBenchmarkScoreTemplate', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    esClient = elasticsearchClientMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    mockCreateBenchmarkScoreIndex.mockClear();
  });

  it('should return true when template is valid', async () => {
    // Mock valid template response
    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [
        {
          name: 'test-template',
          index_template: {
            index_patterns: ['test-pattern'],
            composed_of: [],
            template: {
              mappings: {
                properties: benchmarkScoreMapping.properties,
              },
            },
          },
        },
      ],
    } as any);

    const result = await validateBenchmarkScoreTemplate(esClient, logger);

    expect(result).toBe(true);
    expect(mockCreateBenchmarkScoreIndex).not.toHaveBeenCalled();
  });

  it('should return true when missing fields are successfully fixed', async () => {
    const incompleteProperties = {
      onlyOneField: { type: 'keyword' },
    };

    // First call: template with missing fields
    esClient.indices.getIndexTemplate
      .mockResolvedValueOnce({
        index_templates: [
          {
            name: 'test-template',
            index_template: {
              index_patterns: ['test-pattern'],
              composed_of: [],
              template: {
                mappings: {
                  properties: incompleteProperties,
                },
              },
            },
          },
        ],
      } as any)
      // Second call: after fix - all fields now present
      .mockResolvedValueOnce({
        index_templates: [
          {
            name: 'test-template',
            index_template: {
              index_patterns: ['test-pattern'],
              composed_of: [],
              template: {
                mappings: {
                  properties: benchmarkScoreMapping.properties,
                },
              },
            },
          },
        ],
      } as any);

    mockCreateBenchmarkScoreIndex.mockResolvedValue(undefined);

    const result = await validateBenchmarkScoreTemplate(esClient, logger);

    expect(result).toBe(true);
    expect(mockCreateBenchmarkScoreIndex).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('has field mapping issues. Will trigger fixing.')
    );
  });

  it('should return false when createBenchmarkScoreIndex throws error during missing properties fix', async () => {
    // Mock template with missing properties
    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [
        {
          name: 'test-template',
          index_template: {
            index_patterns: ['test-pattern'],
            composed_of: [],
            template: { mappings: {} },
          },
        },
      ],
    } as any);

    // Mock createBenchmarkScoreIndex to throw an error
    const fixError = new Error('Failed to create index template');
    mockCreateBenchmarkScoreIndex.mockRejectedValue(fixError);

    const result = await validateBenchmarkScoreTemplate(esClient, logger);

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to fix template with missing properties:',
      fixError
    );
  });

  it('should return false when createBenchmarkScoreIndex throws error during field mapping fix', async () => {
    // Mock template with some properties but missing required fields
    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [
        {
          name: 'test-template',
          index_template: {
            index_patterns: ['test-pattern'],
            composed_of: [],
            template: {
              mappings: {
                properties: { onlyOneField: { type: 'keyword' } },
              },
            },
          },
        },
      ],
    } as any);

    // Mock createBenchmarkScoreIndex to throw an error
    const fixError = new Error('Elasticsearch connection failed');
    mockCreateBenchmarkScoreIndex.mockRejectedValue(fixError);

    const result = await validateBenchmarkScoreTemplate(esClient, logger);

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to fix template with field mapping issues:',
      fixError
    );
  });

  it('should return false when createBenchmarkScoreIndex succeeds but verification still fails', async () => {
    // First call: missing properties
    esClient.indices.getIndexTemplate
      .mockResolvedValueOnce({
        index_templates: [
          {
            name: 'test-template',
            index_template: {
              index_patterns: ['test-pattern'],
              composed_of: [],
              template: { mappings: {} },
            },
          },
        ],
      } as any)
      // Second call: after fix - still missing properties (fix didn't work)
      .mockResolvedValueOnce({
        index_templates: [
          {
            name: 'test-template',
            index_template: {
              index_patterns: ['test-pattern'],
              composed_of: [],
              template: { mappings: {} },
            },
          },
        ],
      } as any);

    // Mock createBenchmarkScoreIndex to succeed
    mockCreateBenchmarkScoreIndex.mockResolvedValue(undefined);

    const result = await validateBenchmarkScoreTemplate(esClient, logger);

    expect(result).toBe(false);
    expect(mockCreateBenchmarkScoreIndex).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Template still has no mapping properties after fixing attempt'
    );
  });
});
