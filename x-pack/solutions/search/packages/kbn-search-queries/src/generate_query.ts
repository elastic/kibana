/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RetrieverContainer, SearchHighlight } from '@elastic/elasticsearch/lib/api/types';

import {
  IndexFields,
  IndicesQuerySourceFields,
  GenerateQueryOptions,
  QuerySourceFields,
} from './types';

const SEMANTIC_FIELD_TYPE = 'semantic';

interface Matches {
  queryMatches: any[];
  knnMatches: any[];
}

export function generateSearchQuery(
  fields: IndexFields,
  sourceFields: IndexFields,
  fieldDescriptors: IndicesQuerySourceFields,
  options?: Partial<GenerateQueryOptions>
): { retriever: RetrieverContainer; highlight?: SearchHighlight } {
  const generateOptions: GenerateQueryOptions = {
    rrf: true,
    queryString: '{query}',
    ...options,
  };
  const indices = Object.keys(fieldDescriptors);
  const boolMatches = Object.keys(fields).reduce<Matches>(
    (acc, index) => {
      if (!fieldDescriptors[index]) {
        return acc;
      }
      const indexFields: string[] = fields[index];
      const indexFieldDescriptors: QuerySourceFields = fieldDescriptors[index];

      const semanticMatches = indexFields.map((field) => {
        const semanticField = indexFieldDescriptors.semantic_fields.find((x) => x.field === field);

        if (semanticField) {
          return {
            semantic: {
              field: semanticField.field,
              query: generateOptions.queryString,
            },
          };
        } else {
          return null;
        }
      });

      const sparseMatches =
        indexFields.map((field) => {
          const elserField = indexFieldDescriptors.elser_query_fields.find(
            (x) => x.field === field
          );

          if (elserField && elserField.sparse_vector) {
            // when another index has the same field, we don't want to duplicate the match rule
            const hasExistingSparseMatch = acc.queryMatches.find(
              (x) =>
                // when the field is a sparse_vector field
                x?.sparse_vector?.field === field &&
                x?.sparse_vector?.inference_id === elserField?.model_id
            );

            if (hasExistingSparseMatch) {
              return null;
            }

            return {
              sparse_vector: {
                field: elserField.field,
                inference_id: elserField.model_id,
                query: generateOptions.queryString,
              },
            };
          }

          if (elserField && !elserField.sparse_vector) {
            // when the field is a rank_features field
            const hasExistingSparseMatch = acc.queryMatches.find(
              (x) =>
                x?.text_expansion?.[elserField.field] &&
                x?.sparse_vector?.inference_id === elserField?.model_id
            );

            if (hasExistingSparseMatch) {
              return null;
            }

            return {
              text_expansion: {
                [elserField.field]: {
                  model_id: elserField.model_id,
                  model_text: generateOptions.queryString,
                },
              },
            };
          }
          return null;
        }) || [];

      const bm25Fields = indexFields.filter((field) =>
        indexFieldDescriptors.bm25_query_fields.includes(field)
      );

      const bm25Match =
        bm25Fields.length > 0
          ? {
              multi_match: {
                query: generateOptions.queryString,
                fields: bm25Fields,
              },
            }
          : null;

      const knnMatches = indexFields
        .map((field) => {
          const denseVectorField = indexFieldDescriptors.dense_vector_query_fields.find(
            (x) => x.field === field
          );

          if (denseVectorField) {
            // when the knn field isn't found in all indices, we need a filter to ensure we only use the field from the correct index
            const filter =
              denseVectorField.indices.length < indices.length
                ? { filter: { terms: { _index: denseVectorField.indices } } }
                : {};

            return {
              knn: {
                field: denseVectorField.field,
                num_candidates: 100,
                ...filter,
                query_vector_builder: {
                  text_embedding: {
                    model_id: denseVectorField.model_id,
                    model_text: generateOptions.queryString,
                  },
                },
              },
            };
          }
          return null;
        })
        .filter((x) => !!x);

      const matches = [...sparseMatches, ...semanticMatches, bm25Match].filter((x) => !!x);

      return {
        queryMatches: [...acc.queryMatches, ...matches],
        knnMatches: [...acc.knnMatches, ...knnMatches],
      };
    },
    {
      queryMatches: [],
      knnMatches: [],
    }
  );

  // for single Elser support to make it easy to read - skips bool query
  if (boolMatches.queryMatches.length === 1 && boolMatches.knnMatches.length === 0) {
    const semanticField = boolMatches.queryMatches[0].semantic?.field ?? null;

    let isSourceField = false;
    indices.forEach((index) => {
      if (sourceFields?.[index]?.includes(semanticField)) {
        isSourceField = true;
      }
    });

    return {
      retriever: {
        standard: {
          query: boolMatches.queryMatches[0],
        },
      },
      ...(isSourceField
        ? {
            highlight: {
              fields: {
                [semanticField]: {
                  type: SEMANTIC_FIELD_TYPE,
                  number_of_fragments: 2,
                  order: 'score',
                },
              },
            },
          }
        : {}),
    };
  }

  // for single Dense vector support to make it easy to read - skips bool query
  if (boolMatches.queryMatches.length === 0 && boolMatches.knnMatches.length === 1) {
    return {
      retriever: {
        standard: {
          query: boolMatches.knnMatches[0],
        },
      },
    };
  }

  const matches = [...boolMatches.queryMatches, ...boolMatches.knnMatches];

  if (matches.length === 0) {
    return {
      retriever: {
        standard: {
          query: {
            match_all: {},
          },
        },
      },
    };
  }

  // determine if we need to use a rrf query
  if (generateOptions.rrf) {
    const retrievers = matches.map((clause) => {
      return {
        standard: {
          query: clause,
        },
      };
    });

    const semanticFields = matches
      .filter((match) => match.semantic)
      .map((match) => match.semantic.field)
      .filter((field) => {
        let isSourceField = false;
        indices.forEach((index) => {
          if (sourceFields?.[index]?.includes(field)) {
            isSourceField = true;
          }
        });
        return isSourceField;
      });

    return {
      retriever: {
        rrf: {
          retrievers,
        },
      },
      ...(semanticFields.length > 0
        ? {
            highlight: {
              fields: semanticFields.reduce((acc, field) => {
                acc[field] = {
                  type: SEMANTIC_FIELD_TYPE,
                  number_of_fragments: 2,
                  order: 'score',
                };
                return acc;
              }, {}),
            },
          }
        : {}),
    };
  }

  // No RRF - add all the matches (DENSE + BM25 + SPARSE) to the bool query
  return {
    retriever: {
      standard: {
        query: {
          bool: {
            should: matches,
            minimum_should_match: 1,
          },
        },
      },
    },
  };
}
