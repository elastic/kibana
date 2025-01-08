/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pLimit from 'p-limit';
import { estypes } from '@elastic/elasticsearch';
import { castArray, sortBy, uniq, partition, shuffle } from 'lodash';
import { truncateList } from '@kbn/inference-common';
import { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { rangeQuery, excludeFrozenQuery } from './queries';

export interface DocumentAnalysis {
  total: number;
  sampled: number;
  fields: Array<{
    name: string;
    types: string[];
    cardinality: number | null;
    values: Array<string | number | boolean>;
    empty: boolean;
  }>;
}

export async function getSampleDocuments({
  esClient,
  start,
  end,
  indexPatterns,
  count,
  dslFilter,
}: {
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  indexPatterns: string[];
  count: number;
  dslFilter?: QueryDslQueryContainer[];
}): Promise<{
  total: number;
  samples: Array<Record<string, unknown[]>>;
}> {
  return esClient
    .search({
      index: indexPatterns,
      track_total_hits: true,
      size: count,
      body: {
        query: {
          bool: {
            should: [
              {
                function_score: {
                  functions: [
                    {
                      random_score: {},
                    },
                  ],
                },
              },
            ],
            must: [...rangeQuery(start, end), ...(dslFilter ?? [])],
          },
        },
        sort: {
          _score: {
            order: 'desc',
          },
        },
        _source: false,
        fields: ['*' as const],
      },
    })
    .then((response) => {
      const hits = response.hits.total as estypes.SearchTotalHits;
      if (hits.value === 0) {
        return {
          total: 0,
          samples: [],
        };
      }
      return {
        total: hits.value,
        samples: response.hits.hits.map((hit) => hit.fields ?? {}),
      };
    });
}

export async function getKeywordAndNumericalFields({
  indexPatterns,
  esClient,
  start,
  end,
}: {
  indexPatterns: string[];
  esClient: ElasticsearchClient;
  start: number;
  end: number;
}): Promise<Array<{ name: string; esTypes: string[] }>> {
  const fieldCaps = await esClient.fieldCaps({
    index: indexPatterns,
    fields: '*',
    include_empty_fields: false,
    types: [
      'constant_keyword',
      'keyword',
      'integer',
      'long',
      'double',
      'float',
      'byte',
      'boolean',
      'alias',
      'flattened',
      'ip',
      'aggregate_metric_double',
      'histogram',
    ],
    index_filter: {
      bool: {
        filter: [...excludeFrozenQuery(), ...rangeQuery(start, end)],
      },
    },
  });

  return Object.entries(fieldCaps.fields).map(([fieldName, fieldSpec]) => {
    return {
      name: fieldName,
      esTypes: Object.keys(fieldSpec),
    };
  });
}

export function mergeSampleDocumentsWithFieldCaps({
  total,
  samples,
  fieldCaps,
}: {
  total: number;
  samples: Array<Record<string, unknown[]>>;
  fieldCaps: Array<{ name: string; esTypes?: string[] }>;
}): DocumentAnalysis {
  const nonEmptyFields = new Set<string>();
  const fieldValues = new Map<string, Array<string | number | boolean>>();

  for (const document of samples) {
    Object.keys(document).forEach((field) => {
      if (!nonEmptyFields.has(field)) {
        nonEmptyFields.add(field);
      }

      const values = castArray(document[field]);

      const currentFieldValues = fieldValues.get(field) ?? [];

      values.forEach((value) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          currentFieldValues.push(value);
        }
      });

      fieldValues.set(field, currentFieldValues);
    });
  }

  const fields = fieldCaps.flatMap((spec) => {
    const values = fieldValues.get(spec.name);

    const countByValues = new Map<string | number | boolean, number>();

    values?.forEach((value) => {
      const currentCount = countByValues.get(value) ?? 0;
      countByValues.set(value, currentCount + 1);
    });

    const sortedValues = sortBy(
      Array.from(countByValues.entries()).map(([value, count]) => {
        return {
          value,
          count,
        };
      }),
      'count',
      'desc'
    );

    return {
      name: spec.name,
      types: spec.esTypes ?? [],
      empty: !nonEmptyFields.has(spec.name),
      cardinality: countByValues.size || null,
      values: uniq(sortedValues.flatMap(({ value }) => value)),
    };
  });

  return {
    total,
    sampled: samples.length,
    fields,
  };
}

export function sortAndTruncateAnalyzedFields(analysis: DocumentAnalysis) {
  const { fields, ...meta } = analysis;
  const [nonEmptyFields, emptyFields] = partition(analysis.fields, (field) => !field.empty);

  const sortedFields = [...shuffle(nonEmptyFields), ...shuffle(emptyFields)];

  return {
    ...meta,
    fields: truncateList(
      sortedFields.map((field) => {
        let name = `${field.name}:${field.types.join(',')}`;

        if (field.empty) {
          return `${name} (empty)`;
        }

        name += ` - ${field.cardinality} distinct values`;

        if (
          field.values.length &&
          (field.types.includes('keyword') || field.types.includes('text')) &&
          field.values.length <= 10
        ) {
          return `${name} (${truncateList(
            field.values.map((value) => '`' + value + '`'),
            field.types.includes('text') ? 2 : 25
          ).join(', ')})`;
        }

        return name;
      }),
      500
    ).sort(),
  };
}

export async function confirmConstantsInDataset({
  esClient,
  constants,
  indexPatterns,
}: {
  esClient: ElasticsearchClient;
  constants: Array<{ field: string }>;
  indexPatterns: string[];
}): Promise<Array<{ field: string; constant: boolean; value?: string | number | boolean | null }>> {
  const limiter = pLimit(5);

  return Promise.all(
    constants.map((constant) => {
      return limiter(async () => {
        return esClient
          .termsEnum({
            index: indexPatterns.join(','),
            field: constant.field,
            index_filter: {
              bool: {
                filter: [...excludeFrozenQuery()],
              },
            },
          })
          .then((response) => {
            const isConstant = response.terms.length === 1;
            return {
              field: constant.field,
              constant: isConstant,
              value: isConstant ? response.terms[0] : undefined,
            };
          });
      });
    })
  );
}
