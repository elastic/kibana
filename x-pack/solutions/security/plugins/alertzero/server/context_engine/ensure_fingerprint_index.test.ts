/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { ensureFingerprintIndexMapping } from './ensure_fingerprint_index';

const logger = {
  warn: jest.fn(),
} as unknown as Logger;

const baseTemplate = {
  name: 'ai-index-idx',
  index_template: {
    index_patterns: ['ai-index-idx-*'],
    priority: 500,
    composed_of: ['ai-index@mappings', 'ai-index@custom'],
    ignore_missing_component_templates: ['ai-index@custom'],
    template: {
      settings: { number_of_shards: 1 },
      mappings: { properties: { title: { type: 'text' } } },
    },
  },
};

const createClient = () => {
  const esClient = {
    indices: {
      getIndexTemplate: jest.fn().mockResolvedValue({ index_templates: [baseTemplate] }),
      putIndexTemplate: jest.fn().mockResolvedValue({ acknowledged: true }),
      exists: jest.fn().mockResolvedValue(false),
      getMapping: jest.fn(),
      create: jest.fn(),
      putMapping: jest.fn(),
    },
  };
  return esClient;
};

describe('ensureFingerprintIndexMapping', () => {
  beforeEach(() => {
    jest.mocked(logger.warn).mockClear();
  });

  it('installs a higher-priority template with the nested space privilege', async () => {
    const esClient = createClient();

    await ensureFingerprintIndexMapping(esClient as unknown as ElasticsearchClient, logger);

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith({
      name: 'security-attack-fingerprint',
      index_patterns: ['ai-index-idx-security-attack-fingerprints'],
      priority: 501,
      composed_of: ['ai-index@mappings', 'ai-index@custom'],
      ignore_missing_component_templates: ['ai-index@custom'],
      template: {
        settings: { number_of_shards: 1 },
        mappings: {
          properties: {
            title: { type: 'text' },
            permissions: {
              type: 'object',
              properties: {
                kibana: {
                  type: 'object',
                  properties: {
                    privileges: {
                      type: 'nested',
                      properties: {
                        name: { type: 'keyword' },
                        space: { type: 'keyword' },
                        count: { type: 'long' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  it('does not create the index', async () => {
    const esClient = createClient();

    await ensureFingerprintIndexMapping(esClient as unknown as ElasticsearchClient, logger);

    expect(esClient.indices.create).not.toHaveBeenCalled();
  });

  it('does not change an existing mapping', async () => {
    const esClient = createClient();
    esClient.indices.exists.mockResolvedValue(true);
    esClient.indices.getMapping.mockResolvedValue({
      'ai-index-idx-security-attack-fingerprints': {
        mappings: {
          properties: {
            permissions: {
              properties: { kibana: { properties: { privileges: { type: 'object' } } } },
            },
          },
        },
      },
    });

    await ensureFingerprintIndexMapping(esClient as unknown as ElasticsearchClient, logger);

    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
  });

  it('warns when an existing index is not nested', async () => {
    const esClient = createClient();
    esClient.indices.exists.mockResolvedValue(true);
    esClient.indices.getMapping.mockResolvedValue({
      'ai-index-idx-security-attack-fingerprints': {
        mappings: {
          properties: {
            permissions: {
              properties: { kibana: { properties: { privileges: { type: 'object' } } } },
            },
          },
        },
      },
    });

    await ensureFingerprintIndexMapping(esClient as unknown as ElasticsearchClient, logger);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('until the index is recreated')
    );
  });

  it('does not warn when the existing privilege is nested', async () => {
    const esClient = createClient();
    esClient.indices.exists.mockResolvedValue(true);
    esClient.indices.getMapping.mockResolvedValue({
      'ai-index-idx-security-attack-fingerprints': {
        mappings: {
          properties: {
            permissions: {
              properties: { kibana: { properties: { privileges: { type: 'nested' } } } },
            },
          },
        },
      },
    });

    await ensureFingerprintIndexMapping(esClient as unknown as ElasticsearchClient, logger);

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns when the template cannot be installed', async () => {
    const esClient = createClient();
    esClient.indices.putIndexTemplate.mockRejectedValue(new Error('security_exception'));

    await ensureFingerprintIndexMapping(esClient as unknown as ElasticsearchClient, logger);

    expect(logger.warn).toHaveBeenCalledWith(
      'Attack fingerprint index template was not installed: security_exception'
    );
  });

  it('accepts the optional component list when Elasticsearch returns one name', async () => {
    const esClient = createClient();
    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [
        {
          ...baseTemplate,
          index_template: {
            ...baseTemplate.index_template,
            ignore_missing_component_templates: 'ai-index@custom',
          },
        },
      ],
    });

    await ensureFingerprintIndexMapping(esClient as unknown as ElasticsearchClient, logger);

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        ignore_missing_component_templates: ['ai-index@custom'],
      })
    );
  });

  it('keeps the required mapping component when the base template lists none', async () => {
    const esClient = createClient();
    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [
        {
          ...baseTemplate,
          index_template: {
            ...baseTemplate.index_template,
            composed_of: [],
            ignore_missing_component_templates: ['', 'ai-index@custom'],
          },
        },
      ],
    });

    await ensureFingerprintIndexMapping(esClient as unknown as ElasticsearchClient, logger);

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        composed_of: ['ai-index@mappings'],
        ignore_missing_component_templates: ['ai-index@custom'],
      })
    );
  });

  it('does not mark components optional when the base template cannot be read', async () => {
    const esClient = createClient();
    esClient.indices.getIndexTemplate.mockRejectedValue(new Error('not found'));

    await ensureFingerprintIndexMapping(esClient as unknown as ElasticsearchClient, logger);

    expect(
      esClient.indices.putIndexTemplate.mock.calls[0][0].ignore_missing_component_templates
    ).toBeUndefined();
  });

  it('uses the known AI index mapping when the base template cannot be read', async () => {
    const esClient = createClient();
    esClient.indices.getIndexTemplate.mockRejectedValue(new Error('not found'));

    await ensureFingerprintIndexMapping(esClient as unknown as ElasticsearchClient, logger);

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 501,
        composed_of: ['ai-index@mappings'],
      })
    );
  });
});
