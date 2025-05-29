/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RetrieverContainer,
  SearchHighlight,
  SearchHighlightField,
  QueryDslQueryContainer,
  KnnQuery,
} from '@elastic/elasticsearch/lib/api/types';

import {
  IndexFields,
  QueryGenerationFieldDescriptors,
  GenerateQueryOptions,
  IndexQueryFields,
  GenerateQueryMatches,
  KnnQueryMatch,
} from './types';

const SEMANTIC_FIELD_TYPE = 'semantic';

export function generateSearchQuery(
  fields: IndexFields,
  sourceFields: IndexFields,
  fieldDescriptors: QueryGenerationFieldDescriptors,
  options?: Partial<GenerateQueryOptions>
): { retriever: RetrieverContainer; highlight?: SearchHighlight } {
  const generateOptions: GenerateQueryOptions = {
    rrf: true,
    queryString: '{query}',
    ...options,
  };
  const indices = Object.keys(fieldDescriptors);
  const matches = Object.keys(fields).reduce<GenerateQueryMatches>(
    (acc, index) => {
      if (!fieldDescriptors[index]) {
        return acc;
      }
      const indexFields: string[] = fields[index];
      const indexFieldDescriptors: IndexQueryFields = fieldDescriptors[index];

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
        .map<KnnQueryMatch | null>((field) => {
          const denseVectorField = indexFieldDescriptors.dense_vector_query_fields.find(
            (x) => x.field === field
          );

          if (denseVectorField) {
            // when the knn field isn't found in all indices, we need a filter to ensure we only use the field from the correct index
            const filter: Partial<KnnQuery> =
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
        .filter((x): x is KnnQueryMatch => !!x);

      const qryMatches = [...sparseMatches, ...semanticMatches, bm25Match];

      return {
        queryMatches: [...acc.queryMatches, ...qryMatches].filter(
          (x): x is QueryDslQueryContainer => !!x
        ),
        knnMatches: [...acc.knnMatches, ...knnMatches].filter((x): x is KnnQueryMatch => !!x),
      };
    },
    {
      queryMatches: [],
      knnMatches: [],
    }
  );

  // for single Elser support to make it easy to read - skips bool query
  if (matches.queryMatches.length === 1 && matches.knnMatches.length === 0) {
    const match = matches.queryMatches[0];
    const semanticField = match?.semantic ? match.semantic.field : null;

    const isSourceField =
      semanticField !== null ? isFieldInSourceFields(semanticField, sourceFields) : false;

    return {
      retriever: {
        standard: {
          query: match,
        },
      },
      ...(isSourceField && semanticField
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
  if (matches.queryMatches.length === 0 && matches.knnMatches.length === 1) {
    return {
      retriever: {
        standard: {
          query: matches.knnMatches[0],
        },
      },
    };
  }

  const allMatches = [...matches.queryMatches, ...matches.knnMatches];

  if (allMatches.length === 0) {
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
    const retrievers = allMatches.map((clause) => {
      return {
        standard: {
          query: clause,
        },
      };
    });

    const highlightSemanticFields = allMatches
      .map((match) => ('semantic' in match && match.semantic ? match.semantic.field : null))
      .filter((field): field is string => !!field)
      .filter((field) => isFieldInSourceFields(field, sourceFields));

    return {
      retriever: {
        rrf: {
          retrievers,
        },
      },
      ...(highlightSemanticFields.length > 0
        ? {
            highlight: {
              fields: highlightSemanticFields.reduce<Record<string, SearchHighlightField>>(
                (acc, field) => {
                  acc[field] = {
                    type: SEMANTIC_FIELD_TYPE,
                    number_of_fragments: 2,
                    order: 'score',
                  };
                  return acc;
                },
                {}
              ),
            },
          }
        : {}),
    };
  }

  // No RRF - add all the allMatches (DENSE + BM25 + SPARSE) to the bool query
  return {
    retriever: {
      standard: {
        query: {
          bool: {
            should: allMatches,
            minimum_should_match: 1,
          },
        },
      },
    },
  };
}

function isFieldInSourceFields(field: string, sourceFields: IndexFields): boolean {
  for (const fields of Object.values(sourceFields)) {
    if (fields.includes(field)) {
      return true;
    }
  }
  return false;
}
