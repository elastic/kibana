/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKnowledgeBaseIndicesRoute } from './get_knowledge_base_indices';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getGetKnowledgeBaseIndicesRequest } from '../../__mocks__/request';
import { IndicesGetMappingResponse } from '@elastic/elasticsearch/lib/api/types';

const mockFieldCaps = {
  indices: [
    '.ds-.items-default-2024.11.12-000001',
    '.ds-.lists-default-2024.11.12-000001',
    '.ds-logs-endpoint.alerts-default-2024.11.12-000001',
    '.ds-logs-endpoint.events.process-default-2024.11.12-000001',
    'gtr-1',
    'gtr-with-bug',
    'gtr-with-semantic-1',
    'metrics-endpoint.metadata_current_default',
    'search-elastic-security-docs',
  ],
  fields: {
    'content.inference.chunks.embeddings': {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: [
          '.ds-.items-default-2024.11.12-000001',
          '.ds-.lists-default-2024.11.12-000001',
          '.ds-logs-endpoint.alerts-default-2024.11.12-000001',
          '.ds-logs-endpoint.events.process-default-2024.11.12-000001',
          'gtr-1',
          'gtr-with-bug',
          'metrics-endpoint.metadata_current_default',
        ],
      },
      sparse_vector: {
        type: 'sparse_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['gtr-with-semantic-1'],
      },
    },
    'ai_embeddings.inference.chunks.embeddings': {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: [
          '.ds-.items-default-2024.11.12-000001',
          '.ds-.lists-default-2024.11.12-000001',
          '.ds-logs-endpoint.alerts-default-2024.11.12-000001',
          '.ds-logs-endpoint.events.process-default-2024.11.12-000001',
          'gtr-1',
          'gtr-with-semantic-1',
          'metrics-endpoint.metadata_current_default',
        ],
      },
      sparse_vector: {
        type: 'sparse_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['gtr-with-bug', 'search-elastic-security-docs'],
      },
    },
    'semantic_text.inference.chunks.embeddings': {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: [
          '.ds-.items-default-2024.11.12-000001',
          '.ds-.lists-default-2024.11.12-000001',
          '.ds-logs-endpoint.alerts-default-2024.11.12-000001',
          '.ds-logs-endpoint.events.process-default-2024.11.12-000001',
          'gtr-1',
          'gtr-with-semantic-1',
          'metrics-endpoint.metadata_current_default',
        ],
      },
      sparse_vector: {
        type: 'sparse_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['search-elastic-security-docs'],
      },
    },
    'non_semantic_text.inference.chunks.embeddings': {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: [
          '.ds-.items-default-2024.11.12-000001',
          '.ds-.lists-default-2024.11.12-000001',
          '.ds-logs-endpoint.alerts-default-2024.11.12-000001',
          '.ds-logs-endpoint.events.process-default-2024.11.12-000001',
          'gtr-1',
          'gtr-with-semantic-1',
          'metrics-endpoint.metadata_current_default',
        ],
      },
      sparse_vector: {
        type: 'sparse_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['search-elastic-security-docs'],
      },
    },
    'attachment.deep_sematic_text_field.inference.chunks.embeddings': {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: [
          '.ds-.items-default-2024.11.12-000001',
          '.ds-.lists-default-2024.11.12-000001',
          '.ds-logs-endpoint.alerts-default-2024.11.12-000001',
          '.ds-logs-endpoint.events.process-default-2024.11.12-000001',
          'gtr-1',
          'gtr-with-semantic-1',
          'metrics-endpoint.metadata_current_default',
        ],
      },
      sparse_vector: {
        type: 'sparse_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['search-elastic-security-docs'],
      },
    },
  },
};

const mockMapping: IndicesGetMappingResponse = {
  'gtr-with-semantic-1': {
    mappings: {
      properties: {
        attachment: {
          properties: {
            content: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            content_length: {
              type: 'long',
            },
            content_type: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            creator_tool: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            date: {
              type: 'date',
            },
            format: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            language: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            metadata_date: {
              type: 'date',
            },
            modified: {
              type: 'date',
            },
          },
        },
        content: {
          type: 'semantic_text',
          inference_id: '.elser-2-elasticsearch',
        },
      },
    },
  },
  'gtr-with-bug': {
    mappings: {
      properties: {
        attachment: {
          properties: {
            content: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            content_length: {
              type: 'long',
            },
            content_type: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            creator_tool: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            date: {
              type: 'date',
            },
            format: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            language: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            metadata_date: {
              type: 'date',
            },
            modified: {
              type: 'date',
            },
          },
        },
        'ai-embeddings': {
          type: 'semantic_text',
          inference_id: '.elser-2-elasticsearch',
        },
      },
    },
  },
  'search-elastic-security-docs': {
    mappings: {
      properties: {
        attachment: {
          properties: {
            content: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            content_length: {
              type: 'long',
            },
            content_type: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            creator_tool: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            date: {
              type: 'date',
            },
            format: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            language: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            metadata_date: {
              type: 'date',
            },
            modified: {
              type: 'date',
            },
            deep_sematic_text_field: {
              type: 'semantic_text',
              inference_id: '.elser-2-elasticsearch',
            },
          },
        },
        'ai-embeddings': {
          type: 'semantic_text',
          inference_id: '.elser-2-elasticsearch',
        },
        semantic_text: {
          type: 'semantic_text',
          inference_id: '.elser-2-elasticsearch',
        },
        non_semantic_text: {
          type: 'keyword',
        },
      },
    },
  },
};

describe('Get Knowledge Base Status Route', () => {
  let server: ReturnType<typeof serverMock.create>;

  let { context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    context.core.elasticsearch.client.asCurrentUser.fieldCaps.mockResponse(mockFieldCaps);
    context.core.elasticsearch.client.asCurrentUser.indices.getMapping.mockResponse(mockMapping);

    getKnowledgeBaseIndicesRoute(server.router);
  });

  describe('Status codes', () => {
    test('returns 200 and all indices with `semantic_text` type fields', async () => {
      const response = await server.inject(
        getGetKnowledgeBaseIndicesRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        'gtr-with-semantic-1': ['content'],
        'gtr-with-bug': ['ai-embeddings'],
        'search-elastic-security-docs': [
          'attachment.deep_sematic_text_field',
          'ai-embeddings',
          'semantic_text',
        ],
      });
      expect(context.core.elasticsearch.client.asCurrentUser.fieldCaps).toBeCalledWith({
        index: '*',
        fields: '*',
        types: ['sparse_vector'],
        include_unmapped: true,
        filter_path: 'fields.*.sparse_vector.indices',
      });
    });
  });
});
