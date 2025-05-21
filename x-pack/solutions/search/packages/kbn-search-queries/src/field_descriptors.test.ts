/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFieldDescriptorForIndex } from './field_descriptors';

describe('field_descriptors', () => {
  describe('buildFieldDescriptorForIndex', () => {
    const indexName = 'test';
    const emptyFieldsDescriptor = {
      bm25_query_fields: [],
      dense_vector_query_fields: [],
      elser_query_fields: [],
      skipped_fields: 0,
      source_fields: [],
      semantic_fields: [],
    };
    it('should handle bm25 fields', () => {
      expect(
        buildFieldDescriptorForIndex(indexName, {
          mappings: {
            properties: {
              field1: { type: 'text' },
              field2: { type: 'keyword' },
            },
          },
        })
      ).toEqual({
        test: {
          ...emptyFieldsDescriptor,
          bm25_query_fields: ['field1', 'field2'],
          source_fields: ['field1', 'field2'],
        },
      });
    });
    it('should sparse vector fields', () => {
      expect(
        buildFieldDescriptorForIndex(indexName, {
          mappings: {
            properties: {
              field1: { type: 'sparse_vector' },
            },
          },
        })
      ).toEqual({
        test: {
          ...emptyFieldsDescriptor,
          elser_query_fields: [
            {
              field: 'field1',
              model_id: '',
              indices: [indexName],
              sparse_vector: true,
            },
          ],
        },
      });
    });
    it('should dense vector fields', () => {
      expect(
        buildFieldDescriptorForIndex(indexName, {
          mappings: {
            properties: {
              field1: { type: 'dense_vector' },
            },
          },
        })
      ).toEqual({
        test: {
          ...emptyFieldsDescriptor,
          dense_vector_query_fields: [
            {
              field: 'field1',
              model_id: '',
              indices: [indexName],
            },
          ],
        },
      });
    });
    it('should semantic_text fields', () => {
      expect(
        buildFieldDescriptorForIndex(indexName, {
          mappings: {
            properties: {
              field1: {
                type: 'semantic_text',
                inference_id: '.elser-2-elasticsearch',
                // @ts-ignore
                model_settings: {
                  service: 'elasticsearch',
                  task_type: 'sparse_embedding',
                },
              },
            },
          },
        })
      ).toEqual({
        test: {
          ...emptyFieldsDescriptor,
          semantic_fields: [
            {
              field: 'field1',
              inferenceId: '.elser-2-elasticsearch',
              embeddingType: 'sparse_vector',
              indices: [indexName],
            },
          ],
          source_fields: ['field1'],
        },
      });
    });
    it('should ignore non-text fields', () => {
      expect(
        buildFieldDescriptorForIndex(indexName, {
          mappings: {
            properties: {
              field1: { type: 'text' },
              field2: { type: 'float' },
            },
          },
        })
      ).toEqual({
        test: {
          ...emptyFieldsDescriptor,
          bm25_query_fields: ['field1'],
          source_fields: ['field1'],
          skipped_fields: 1,
        },
      });
    });
    it('should parse nested fields', () => {
      expect(
        buildFieldDescriptorForIndex(indexName, {
          mappings: {
            properties: {
              field1: {
                type: 'text',
                fields: {
                  semanticField: {
                    type: 'semantic_text',
                    inference_id: 'elser-endpoint',
                    // @ts-ignore - type is wrong currently
                    model_settings: {
                      service: 'elasticsearch',
                      task_type: 'sparse_embedding',
                    },
                  },
                },
              },
            },
          },
        })
      ).toEqual({
        test: {
          ...emptyFieldsDescriptor,
          source_fields: ['field1', 'field1.semanticField'],
          bm25_query_fields: ['field1'],
          semantic_fields: [
            {
              field: 'field1.semanticField',
              inferenceId: 'elser-endpoint',
              embeddingType: 'sparse_vector',
              indices: [indexName],
            },
          ],
        },
      });
    });
    it('should parse nested properties', () => {
      expect(
        buildFieldDescriptorForIndex(indexName, {
          mappings: {
            properties: {
              field1: { type: 'text' },
              field2: {
                type: 'object',
                properties: {
                  field3: {
                    type: 'text',
                    fields: {
                      semanticField: {
                        type: 'semantic_text',
                        inference_id: 'elser-endpoint',
                        // @ts-ignore - type is wrong currently
                        model_settings: {
                          service: 'elasticsearch',
                          task_type: 'sparse_embedding',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        })
      ).toEqual({
        test: {
          ...emptyFieldsDescriptor,
          bm25_query_fields: ['field1', 'field2.field3'],
          source_fields: ['field1', 'field2.field3', 'field2.field3.semanticField'],
          semantic_fields: [
            {
              field: 'field2.field3.semanticField',
              inferenceId: 'elser-endpoint',
              embeddingType: 'sparse_vector',
              indices: [indexName],
            },
          ],
        },
      });
    });
  });
});
