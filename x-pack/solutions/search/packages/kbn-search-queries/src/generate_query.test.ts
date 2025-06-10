/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryGenerationFieldDescriptors } from './types';
import { generateSearchQuery } from './generate_query';

describe('generate_query', () => {
  const sourceFields = { index1: [], index2: [] };

  describe('generateSearchQuery', () => {
    it('should return a sparse single query', () => {
      const fields = {
        index1: ['field1'],
      };

      const fieldDescriptors: QueryGenerationFieldDescriptors = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: true },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(generateSearchQuery(fields, sourceFields, fieldDescriptors)).toEqual({
        retriever: {
          standard: {
            query: {
              sparse_vector: {
                field: 'field1',
                inference_id: 'model1',
                query: '{query}',
              },
            },
          },
        },
      });
    });

    it('should return a text_expansion single query', () => {
      const fields = {
        index1: ['field1'],
      };

      const fieldDescriptors: QueryGenerationFieldDescriptors = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: false },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(generateSearchQuery(fields, sourceFields, fieldDescriptors)).toEqual({
        retriever: {
          standard: {
            query: {
              text_expansion: {
                field1: {
                  model_id: 'model1',
                  model_text: '{query}',
                },
              },
            },
          },
        },
      });
    });

    it('should return a knn query single', () => {
      const fields = {
        index1: ['field1'],
      };

      const fieldDescriptors: QueryGenerationFieldDescriptors = {
        index1: {
          elser_query_fields: [],
          dense_vector_query_fields: [{ field: 'field1', model_id: 'model1', indices: ['index1'] }],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(generateSearchQuery(fields, sourceFields, fieldDescriptors)).toEqual({
        retriever: {
          standard: {
            query: {
              knn: {
                field: 'field1',
                num_candidates: 100,
                query_vector_builder: {
                  text_embedding: {
                    model_id: 'model1',
                    model_text: '{query}',
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should return a query from multiple ', () => {
      const fields = {
        index1: ['field1'],
        index2: ['field1'],
      };

      const fieldDescriptors: QueryGenerationFieldDescriptors = {
        index1: {
          elser_query_fields: [
            {
              field: 'field1',
              model_id: 'model1',
              indices: ['index1', 'index2'],
              sparse_vector: true,
            },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
        index2: {
          elser_query_fields: [
            {
              field: 'field1',
              model_id: 'model1',
              indices: ['index1', 'index2'],
              sparse_vector: true,
            },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(generateSearchQuery(fields, sourceFields, fieldDescriptors)).toEqual({
        retriever: {
          standard: {
            query: {
              sparse_vector: {
                field: 'field1',
                inference_id: 'model1',
                query: '{query}',
              },
            },
          },
        },
      });
    });

    it('should return a query from multiple fields', () => {
      const fields = {
        index1: ['field1'],
        index2: ['field2'],
      };

      const fieldDescriptors: QueryGenerationFieldDescriptors = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: true },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
        index2: {
          elser_query_fields: [
            { field: 'field2', model_id: 'model1', indices: ['index2'], sparse_vector: true },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(generateSearchQuery(fields, sourceFields, fieldDescriptors)).toEqual({
        retriever: {
          rrf: {
            retrievers: [
              {
                standard: {
                  query: {
                    sparse_vector: {
                      field: 'field1',
                      inference_id: 'model1',
                      query: '{query}',
                    },
                  },
                },
              },
              {
                standard: {
                  query: {
                    sparse_vector: {
                      field: 'field2',
                      inference_id: 'model1',
                      query: '{query}',
                    },
                  },
                },
              },
            ],
          },
        },
      });
    });

    describe('hybrid without RRF', () => {
      it('should return a hybrid query', () => {
        const fields = {
          index1: ['field1', 'content', 'title'],
          index2: ['field2'],
        };

        const fieldDescriptors: QueryGenerationFieldDescriptors = {
          index1: {
            elser_query_fields: [
              { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: true },
            ],
            dense_vector_query_fields: [],
            bm25_query_fields: ['content', 'title'],
            source_fields: [],
            skipped_fields: 0,
            semantic_fields: [],
          },
          index2: {
            elser_query_fields: [
              { field: 'field2', model_id: 'model1', indices: ['index2'], sparse_vector: true },
            ],
            dense_vector_query_fields: [],
            bm25_query_fields: [],
            source_fields: [],
            skipped_fields: 0,
            semantic_fields: [],
          },
        };

        expect(generateSearchQuery(fields, sourceFields, fieldDescriptors, { rrf: false })).toEqual(
          {
            retriever: {
              standard: {
                query: {
                  bool: {
                    should: [
                      {
                        sparse_vector: {
                          field: 'field1',
                          inference_id: 'model1',
                          query: '{query}',
                        },
                      },
                      {
                        multi_match: {
                          query: '{query}',
                          fields: ['content', 'title'],
                        },
                      },
                      {
                        sparse_vector: {
                          field: 'field2',
                          inference_id: 'model1',
                          query: '{query}',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              },
            },
          }
        );
      });
    });

    describe('hybrid with RRF', () => {
      it('should return a hybrid query', () => {
        const fields = {
          index1: ['field1', 'content', 'title'],
          index2: ['field2'],
        };

        const fieldDescriptors: QueryGenerationFieldDescriptors = {
          index1: {
            elser_query_fields: [
              { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: true },
            ],
            dense_vector_query_fields: [],
            bm25_query_fields: ['content', 'title'],
            source_fields: [],
            skipped_fields: 0,
            semantic_fields: [],
          },
          index2: {
            elser_query_fields: [
              { field: 'field2', model_id: 'model1', indices: ['index2'], sparse_vector: true },
            ],
            dense_vector_query_fields: [],
            bm25_query_fields: [],
            source_fields: [],
            skipped_fields: 0,
            semantic_fields: [],
          },
        };

        expect(generateSearchQuery(fields, sourceFields, fieldDescriptors)).toEqual({
          retriever: {
            rrf: {
              retrievers: [
                {
                  standard: {
                    query: {
                      sparse_vector: {
                        field: 'field1',
                        inference_id: 'model1',
                        query: '{query}',
                      },
                    },
                  },
                },
                {
                  standard: {
                    query: {
                      multi_match: {
                        query: '{query}',
                        fields: ['content', 'title'],
                      },
                    },
                  },
                },
                {
                  standard: {
                    query: {
                      sparse_vector: {
                        field: 'field2',
                        inference_id: 'model1',
                        query: '{query}',
                      },
                    },
                  },
                },
              ],
            },
          },
        });
      });
    });

    it('dense vector only', () => {
      const fields = {
        index1: ['field1'],
      };

      const fieldDescriptors: QueryGenerationFieldDescriptors = {
        index1: {
          elser_query_fields: [],
          dense_vector_query_fields: [{ field: 'field1', model_id: 'model1', indices: ['index1'] }],
          bm25_query_fields: ['content', 'title'],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
        index2: {
          elser_query_fields: [
            { field: 'field2', model_id: 'model1', indices: ['index2'], sparse_vector: true },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(generateSearchQuery(fields, sourceFields, fieldDescriptors)).toEqual({
        retriever: {
          standard: {
            query: {
              knn: {
                field: 'field1',
                num_candidates: 100,
                filter: { terms: { _index: ['index1'] } },
                query_vector_builder: {
                  text_embedding: {
                    model_id: 'model1',
                    model_text: '{query}',
                  },
                },
              },
            },
          },
        },
      });
    });

    it('dense vector + bm25 only', () => {
      const fields = {
        index1: ['field1', 'title', 'content'],
      };

      const fieldDescriptors: QueryGenerationFieldDescriptors = {
        index1: {
          elser_query_fields: [],
          dense_vector_query_fields: [{ field: 'field1', model_id: 'model1', indices: ['index1'] }],
          bm25_query_fields: ['content', 'title'],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(generateSearchQuery(fields, sourceFields, fieldDescriptors)).toEqual({
        retriever: {
          rrf: {
            retrievers: [
              {
                standard: {
                  query: {
                    multi_match: {
                      query: '{query}',
                      fields: ['title', 'content'],
                    },
                  },
                },
              },
              {
                standard: {
                  query: {
                    knn: {
                      field: 'field1',
                      num_candidates: 100,
                      query_vector_builder: {
                        text_embedding: {
                          model_id: 'model1',
                          model_text: '{query}',
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      });
    });

    describe('semantic fields', () => {
      describe('sparse_vector embedding', () => {
        it('should return a query with semantic field, specified as a source field', () => {
          // as the field is specified as a source field, it should use the nested query and manually calling the sparse_vector query
          const fields = {
            index1: ['field2', 'title', 'content'],
          };

          const fieldDescriptors: QueryGenerationFieldDescriptors = {
            index1: {
              elser_query_fields: [],
              dense_vector_query_fields: [
                { field: 'field1', model_id: 'model1', indices: ['index1'] },
              ],
              bm25_query_fields: ['content', 'title'],
              source_fields: [],
              skipped_fields: 0,
              semantic_fields: [
                {
                  field: 'field2',
                  inferenceId: 'model2',
                  indices: ['index1'],
                  embeddingType: 'sparse_vector',
                },
              ],
            },
          };

          expect(
            generateSearchQuery(
              fields,
              {
                index1: ['field2'],
              },
              fieldDescriptors
            )
          ).toEqual({
            retriever: {
              rrf: {
                retrievers: [
                  {
                    standard: {
                      query: {
                        semantic: {
                          field: 'field2',
                          query: '{query}',
                        },
                      },
                    },
                  },
                  {
                    standard: {
                      query: { multi_match: { fields: ['title', 'content'], query: '{query}' } },
                    },
                  },
                ],
              },
            },
            highlight: {
              fields: {
                field2: {
                  number_of_fragments: 2,
                  order: 'score',
                  type: 'semantic',
                },
              },
            },
          });
        });

        it('should return a query with semantic field, specified not as a source field', () => {
          // this should fallback to using the semantic field for querying
          const fields = {
            index1: ['field2', 'title', 'content'],
          };

          const fieldDescriptors: QueryGenerationFieldDescriptors = {
            index1: {
              elser_query_fields: [],
              dense_vector_query_fields: [
                { field: 'field1', model_id: 'model1', indices: ['index1'] },
              ],
              bm25_query_fields: ['content', 'title'],
              source_fields: [],
              skipped_fields: 0,
              semantic_fields: [
                {
                  field: 'field2',
                  inferenceId: 'model2',
                  indices: ['index1'],
                  embeddingType: 'sparse_vector',
                },
              ],
            },
          };

          expect(
            generateSearchQuery(
              fields,
              {
                index1: ['content'],
              },
              fieldDescriptors
            )
          ).toEqual({
            retriever: {
              rrf: {
                retrievers: [
                  { standard: { query: { semantic: { field: 'field2', query: '{query}' } } } },
                  {
                    standard: {
                      query: { multi_match: { fields: ['title', 'content'], query: '{query}' } },
                    },
                  },
                ],
              },
            },
          });
        });
      });

      describe('dense embedding', () => {
        it('should return a query with semantic field, specified as a source field', () => {
          // as the field is specified as a source field, it should use the nested query and manually calling the knn query
          const fields = {
            index1: ['field2', 'title', 'content'],
          };

          const fieldDescriptors: QueryGenerationFieldDescriptors = {
            index1: {
              elser_query_fields: [],
              dense_vector_query_fields: [
                { field: 'field1', model_id: 'model1', indices: ['index1'] },
              ],
              bm25_query_fields: ['content', 'title'],
              source_fields: [],
              skipped_fields: 0,
              semantic_fields: [
                {
                  field: 'field2',
                  inferenceId: 'model2',
                  indices: ['index1'],
                  embeddingType: 'dense_vector',
                },
              ],
            },
          };

          expect(
            generateSearchQuery(
              fields,
              {
                index1: ['field2'],
              },
              fieldDescriptors
            )
          ).toEqual({
            retriever: {
              rrf: {
                retrievers: [
                  {
                    standard: {
                      query: {
                        semantic: {
                          field: 'field2',
                          query: '{query}',
                        },
                      },
                    },
                  },
                  {
                    standard: {
                      query: { multi_match: { fields: ['title', 'content'], query: '{query}' } },
                    },
                  },
                ],
              },
            },
            highlight: {
              fields: {
                field2: {
                  number_of_fragments: 2,
                  order: 'score',
                  type: 'semantic',
                },
              },
            },
          });
        });

        it('should return a query with semantic field, specified not as a source field', () => {
          // this should fallback to using the semantic field for querying
          const fields = {
            index1: ['field2', 'title', 'content'],
          };

          const fieldDescriptors: QueryGenerationFieldDescriptors = {
            index1: {
              elser_query_fields: [],
              dense_vector_query_fields: [
                { field: 'field1', model_id: 'model1', indices: ['index1'] },
              ],
              bm25_query_fields: ['content', 'title'],
              source_fields: [],
              skipped_fields: 0,
              semantic_fields: [
                {
                  field: 'field2',
                  inferenceId: 'model2',
                  indices: ['index1'],
                  embeddingType: 'dense_vector',
                },
              ],
            },
          };

          expect(
            generateSearchQuery(
              fields,
              {
                index1: ['content'],
              },
              fieldDescriptors
            )
          ).toEqual({
            retriever: {
              rrf: {
                retrievers: [
                  { standard: { query: { semantic: { field: 'field2', query: '{query}' } } } },
                  {
                    standard: {
                      query: { multi_match: { fields: ['title', 'content'], query: '{query}' } },
                    },
                  },
                ],
              },
            },
          });
        });
      });
    });
  });
});
