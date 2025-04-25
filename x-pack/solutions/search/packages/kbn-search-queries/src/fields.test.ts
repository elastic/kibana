/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDefaultQueryFields,
  getDefaultSourceFields,
  getIndicesWithNoSourceFields,
  buildFieldDescriptorForIndex,
} from './fields';
import { IndicesQuerySourceFields } from './types';

describe('fields', () => {
  describe('getDefaultQueryFields', () => {
    it('should return default ELSER query fields', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: true },
          ],
          dense_vector_query_fields: [
            { field: 'field1', model_id: 'dense_model', indices: ['index1'] },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(getDefaultQueryFields(fieldDescriptors)).toEqual({ index1: ['field1'] });
    });

    it('should return default elser query fields for multiple indices', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: true },
          ],
          dense_vector_query_fields: [
            {
              field: 'dv_field1',
              model_id: 'dense_model',

              indices: ['index1', 'index2'],
            },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
        index2: {
          elser_query_fields: [
            { field: 'vector', model_id: 'model1', indices: ['index2'], sparse_vector: true },
          ],
          dense_vector_query_fields: [
            {
              field: 'dv_field1',
              model_id: 'dense_model',

              indices: ['index1', 'index2'],
            },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(getDefaultQueryFields(fieldDescriptors)).toEqual({
        index1: ['field1'],
        index2: ['vector'],
      });
    });

    it('should return elser query fields for default fields', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: true },
          ],
          dense_vector_query_fields: [
            {
              field: 'dv_field1',
              model_id: 'dense_model',

              indices: ['index1', 'index2'],
            },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
        index2: {
          elser_query_fields: [
            { field: 'vector', model_id: 'model1', indices: ['index2'], sparse_vector: true },
          ],
          dense_vector_query_fields: [
            {
              field: 'dv_field1',
              model_id: 'dense_model',

              indices: ['index1', 'index2'],
            },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(getDefaultQueryFields(fieldDescriptors)).toEqual({
        index1: ['field1'],
        index2: ['vector'],
      });
    });

    it('should fallback to dense vector fields for index', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [],
          dense_vector_query_fields: [
            { field: 'dv_field1', model_id: 'dense_model', indices: ['index1'] },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(getDefaultQueryFields(fieldDescriptors)).toEqual({ index1: ['dv_field1'] });
    });

    it('should fallback to all BM25 fields in index, using suggested fields', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [],
          dense_vector_query_fields: [],
          bm25_query_fields: ['title', 'text', 'content'],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(getDefaultQueryFields(fieldDescriptors)).toEqual({
        index1: ['title', 'text', 'content'],
      });
    });

    it('should fallback to all BM25 fields in index, only using first unrecognised field', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [],
          dense_vector_query_fields: [],
          bm25_query_fields: ['unknown1', 'unknown2'],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(getDefaultQueryFields(fieldDescriptors)).toEqual({
        index1: ['unknown1'],
      });
    });
  });

  describe('getDefaultSourceFields', () => {
    it('should return source fields', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        'search-search-labs': {
          elser_query_fields: [],
          dense_vector_query_fields: [],
          semantic_fields: [],
          bm25_query_fields: [
            'additional_urls',
            'title',
            'links',
            'id',
            'url_host',
            'url_path',
            'url_path_dir3',
            'body_content',
            'domains',
            'url',
            'url_scheme',
            'meta_description',
            'headings',
            'url_path_dir2',
            'url_path_dir1',
          ],
          source_fields: [
            'additional_urls',
            'title',
            'links',
            'id',
            'url_host',
            'url_path',
            'url_path_dir3',
            'body_content',
            'domains',
            'url',
            'url_scheme',
            'meta_description',
            'headings',
            'url_path_dir2',
            'url_path_dir1',
          ],
          skipped_fields: 0,
        },
      };

      expect(getDefaultSourceFields(fieldDescriptors)).toEqual({
        'search-search-labs': [
          'additional_urls',
          'title',
          'links',
          'id',
          'url_host',
          'url_path',
          'url_path_dir3',
          'body_content',
          'domains',
          'url',
          'url_scheme',
          'meta_description',
          'headings',
          'url_path_dir2',
          'url_path_dir1',
        ],
      });
    });

    it('should return undefined with index name when no source fields found', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        'search-search-labs': {
          elser_query_fields: [],
          semantic_fields: [],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      const defaultSourceFields = getDefaultSourceFields(fieldDescriptors);

      expect(defaultSourceFields).toEqual({
        'search-search-labs': [undefined],
      });
    });
  });

  describe('getIndicesWithNoSourceFields', () => {
    it('should return undefined if all indices have source fields', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        empty_index: {
          elser_query_fields: [],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
        non_empty_index: {
          elser_query_fields: [],
          dense_vector_query_fields: [],
          bm25_query_fields: ['field2'],
          source_fields: ['field1'],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };
      expect(getIndicesWithNoSourceFields(fieldDescriptors)).toBe('empty_index');
    });
  });

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
          skipped_fields: 1,
        },
      });
    });
  });
});
