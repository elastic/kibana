/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexFields, QueryGenerationFieldDescriptors } from './types';

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

export function getDefaultSourceFields(
  fieldDescriptors: QueryGenerationFieldDescriptors
): IndexFields {
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

export const getIndicesWithNoSourceFields = (
  fields: QueryGenerationFieldDescriptors
): string[] | undefined => {
  const defaultSourceFields = getDefaultSourceFields(fields);
  const indices = Object.keys(defaultSourceFields).reduce<string[]>((result, index: string) => {
    if (defaultSourceFields[index].length === 0) {
      result.push(index);
    }

    return result;
  }, []);

  return indices.length === 0 ? undefined : indices;
};

export function getDefaultQueryFields(
  fieldDescriptors: QueryGenerationFieldDescriptors
): IndexFields {
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
