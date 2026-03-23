/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchSLODefinitionsParams, SearchSLODefinitionResponse } from '@kbn/slo-schema';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AggregationsCompositeAggregateKey } from '@elastic/elasticsearch/lib/api/types';
import { ALL_VALUE } from '@kbn/slo-schema';
import { getSummaryIndices } from './utils/get_summary_indices';
import type { SLOSettings } from '../domain/models';

interface SLOSourceDocument {
  slo?: {
    id?: string;
    name?: string;
    groupBy?: unknown;
  };
  kibanaUrl?: string;
}

interface SLODetailsAggregation {
  hits: {
    hits: Array<{
      _source?: SLOSourceDocument;
      fields?: {
        remoteName?: string | string[];
      };
    }>;
  };
}

interface SLOBucket {
  key: {
    slo_id: string;
  };
  slo_details: SLODetailsAggregation;
}

interface SLODefinitionsAggregation {
  after_key?: AggregationsCompositeAggregateKey;
  buckets: SLOBucket[];
}

interface SLOSearchAggregations {
  slo_definitions: SLODefinitionsAggregation;
}

export class SearchSLODefinitions {
  constructor(
    private esClient: ElasticsearchClient,
    private logger: Logger,
    private spaceId: string,
    private settings: SLOSettings
  ) {}

  public async execute(params: SearchSLODefinitionsParams): Promise<SearchSLODefinitionResponse> {
    const { search, size = 10, searchAfter } = params ?? {};
    if (size < 1 || size > 100) {
      throw new Error('Size must be between 1 and 100');
    }
    const { indices } = await getSummaryIndices(this.esClient, this.settings);

    try {
      let afterObj: AggregationsCompositeAggregateKey | undefined;
      if (searchAfter) {
        try {
          afterObj = JSON.parse(searchAfter) as AggregationsCompositeAggregateKey;
        } catch (e) {
          // ignore parse errors, treat as no after
        }
      }

      const response = await this.esClient.search<SLOSourceDocument, SLOSearchAggregations>({
        index: indices,
        size: 0,
        runtime_mappings: {
          remoteName: {
            type: 'keyword',
            script: {
              source: `
                String idx = doc['_index'].value;
                int colonPos = idx.indexOf(':');
                if (colonPos > 0) {
                  emit(idx.substring(0, colonPos));
                } else {
                  emit('local');
                }
              `,
            },
          },
        },
        query: {
          bool: {
            filter: [
              { term: { spaceId: this.spaceId } },
              ...(search
                ? [
                    {
                      simple_query_string: {
                        query: search,
                        fields: ['slo.name^3', 'slo.description^2', 'slo.tags'],
                        default_operator: 'AND' as const,
                        analyze_wildcard: true,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        aggs: {
          slo_definitions: {
            composite: {
              size,
              sources: [{ slo_id: { terms: { field: 'slo.id' } } }],
              ...(afterObj ? { after: afterObj } : {}),
            },
            aggs: {
              slo_details: {
                top_hits: {
                  _source: { includes: ['slo.id', 'slo.name', 'slo.groupBy', 'kibanaUrl'] },
                  size: 1,
                  sort: [
                    {
                      'slo.revision': {
                        order: 'desc',
                      },
                    },
                  ],
                  fields: ['remoteName'],
                },
              },
            },
          },
        },
      });

      const buckets = response.aggregations?.slo_definitions?.buckets ?? [];

      const results = buckets.map((bucket) => {
        const hit = bucket.slo_details.hits.hits[0];
        const sloSrc = hit?._source?.slo ?? {};
        const kibanaUrl = hit?._source?.kibanaUrl;
        const normalizedRemoteName = Array.isArray(hit?.fields?.remoteName)
          ? hit.fields.remoteName[0]
          : hit?.fields?.remoteName;
        const remoteName = normalizedRemoteName === 'local' ? undefined : normalizedRemoteName;

        const groupBy = normalizeGroupBy(sloSrc.groupBy);

        const item: {
          id: string;
          name: string;
          groupBy: string[];
          remote?: { remoteName: string; kibanaUrl: string };
        } = {
          id: sloSrc.id ?? bucket.key.slo_id,
          name: sloSrc.name ?? '',
          groupBy,
        };

        if (remoteName || kibanaUrl) {
          item.remote = { remoteName: remoteName ?? '', kibanaUrl: kibanaUrl ?? '' };
        }

        return item;
      });

      const afterKey = response.aggregations?.slo_definitions?.after_key;

      return {
        results,
        searchAfter: afterKey ? JSON.stringify(afterKey) : undefined,
      };
    } catch (error) {
      this.logger.error(`Error searching SLO Definitions: ${error}`);
      return { results: [] };
    }
  }
}

function normalizeGroupBy(rawGroupBy: unknown): string[] {
  if (rawGroupBy === undefined || rawGroupBy === null) return [];
  if (rawGroupBy === ALL_VALUE) return [];
  if (Array.isArray(rawGroupBy)) {
    return rawGroupBy
      .flat()
      .filter((g) => g !== ALL_VALUE)
      .map((g) => String(g));
  }
  if (typeof rawGroupBy === 'string') return [rawGroupBy];
  return [];
}
