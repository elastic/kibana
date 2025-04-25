/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';
import type { IndexFields, IndicesQuerySourceFields, QuerySourceFields } from './types';

// These fields are used to suggest the fields to use for the query
// If the field is not found in the suggested fields,
// we will use the first field for BM25 and all fields for vectors
export const SUGGESTED_SPARSE_FIELDS = [
  'vector.tokens', // LangChain field
];

export const SUGGESTED_BM25_FIELDS = [
  'title',
  'body_content',
  'page_content_text',
  'text',
  'content',
  `text_field`,
];

export const SUGGESTED_DENSE_VECTOR_FIELDS = ['content_vector.tokens'];

export function getDefaultSourceFields(fieldDescriptors: IndicesQuerySourceFields): IndexFields {
  const indexFields = Object.keys(fieldDescriptors).reduce<IndexFields>(
    (acc: IndexFields, index: string) => {
      const indexFieldDescriptors = fieldDescriptors[index];

      // if there are no source fields, we don't need to suggest anything
      if (indexFieldDescriptors.source_fields.length === 0) {
        return {
          ...acc,
          [index]: [],
        };
      }

      return {
        ...acc,
        [index]: indexFieldDescriptors.source_fields,
      };
    },
    {}
  );

  return indexFields;
}

export function getIndicesWithNoSourceFields(fields: IndicesQuerySourceFields): string | undefined {
  const defaultSourceFields = getDefaultSourceFields(fields);
  const indices = Object.keys(defaultSourceFields).reduce<string[]>((result, index: string) => {
    if (defaultSourceFields[index].length === 0) {
      result.push(index);
    }

    return result;
  }, []);

  return indices.length === 0 ? undefined : indices.join();
}

export function getDefaultQueryFields(fieldDescriptors: IndicesQuerySourceFields): IndexFields {
  const indexFields = Object.keys(fieldDescriptors).reduce<IndexFields>(
    (acc: IndexFields, index: string) => {
      const indexFieldDescriptors = fieldDescriptors[index];
      const fields: string[] = [];

      if (indexFieldDescriptors.semantic_fields.length > 0) {
        fields.push(...indexFieldDescriptors.semantic_fields.map((x) => x.field));
      } else if (indexFieldDescriptors.elser_query_fields.length > 0) {
        const suggested = indexFieldDescriptors.elser_query_fields.filter((x) =>
          SUGGESTED_SPARSE_FIELDS.includes(x.field)
        );
        if (suggested.length > 0) {
          fields.push(...suggested.map((x) => x.field));
        } else {
          fields.push(...indexFieldDescriptors.elser_query_fields.map((x) => x.field));
        }
      } else if (indexFieldDescriptors.dense_vector_query_fields.length > 0) {
        const suggested = indexFieldDescriptors.dense_vector_query_fields.filter((x) =>
          SUGGESTED_DENSE_VECTOR_FIELDS.includes(x.field)
        );

        if (suggested.length > 0) {
          fields.push(...suggested.map((x) => x.field));
        } else {
          fields.push(...indexFieldDescriptors.dense_vector_query_fields.map((x) => x.field));
        }
      } else if (indexFieldDescriptors.bm25_query_fields.length > 0) {
        const suggested = indexFieldDescriptors.bm25_query_fields.filter((x) =>
          SUGGESTED_BM25_FIELDS.includes(x)
        );
        if (suggested.length > 0) {
          fields.push(...suggested);
        } else {
          fields.push(indexFieldDescriptors.bm25_query_fields[0]);
        }
      }

      return {
        ...acc,
        [index]: fields,
      };
    },
    {}
  );

  return indexFields;
}

export function buildFieldDescriptorForIndex(
  indexName: string,
  indexMappings: IndicesGetMappingIndexMappingRecord
): IndicesQuerySourceFields {
  const indexFields: QuerySourceFields = {
    elser_query_fields: [],
    dense_vector_query_fields: [],
    bm25_query_fields: [],
    source_fields: [],
    semantic_fields: [],
    skipped_fields: 0,
  };
  const result: IndicesQuerySourceFields = {
    [indexName]: indexFields,
  };

  if (!indexMappings.mappings.properties) {
    return result;
  }
  for (const [fieldName, fieldDescriptor] of Object.entries(indexMappings.mappings.properties)) {
    if (fieldDescriptor.type === 'dense_vector') {
      indexFields.dense_vector_query_fields.push({
        field: fieldName,
        model_id: '',
        indices: [indexName],
      });
    } else if (fieldDescriptor.type === 'sparse_vector') {
      indexFields.elser_query_fields.push({
        field: fieldName,
        model_id: '',
        indices: [indexName],
        sparse_vector: true,
      });
    } else if (fieldDescriptor.type === 'text' || fieldDescriptor.type === 'keyword') {
      indexFields.bm25_query_fields.push(fieldName);
    } else if (fieldDescriptor.type === 'semantic_text') {
      const embeddingType = embeddingTypeFromTaskType(
        // @ts-ignore - model_settings is missing from the spec, but can exist
        fieldDescriptor?.model_settings?.task_type ?? ''
      );
      indexFields.semantic_fields.push({
        field: fieldName,
        inferenceId: fieldDescriptor.inference_id,
        embeddingType,
        indices: [indexName],
      });
    } else {
      indexFields.skipped_fields++;
    }
  }

  return result;
}

function embeddingTypeFromTaskType(taskType: string): 'dense_vector' | 'sparse_vector' {
  switch (taskType) {
    case 'sparse_embedding':
      return 'sparse_vector';
    case 'text_embedding':
      return 'dense_vector';
    default:
      return 'dense_vector';
  }
}
