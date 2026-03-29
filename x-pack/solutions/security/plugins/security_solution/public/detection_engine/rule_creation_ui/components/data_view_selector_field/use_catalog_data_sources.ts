/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { lastValueFrom } from 'rxjs';
import { useKibana } from '../../../../common/lib/kibana';

const CATALOG_INDEX = '.kibana-data-source-catalog';

interface CatalogHitSource {
  name: string;
  type: string;
  integration?: {
    package_title?: string;
    description?: string;
  };
  mapping?: {
    ecs_field_coverage?: number;
  };
  stats?: {
    doc_count?: number;
    freshness_category?: string;
  };
  semantic?: {
    topics?: string[];
  };
}

export interface CatalogDataSource {
  name: string;
  type: string;
  integrationTitle?: string;
  integrationDescription?: string;
  ecsFieldCoverage: number;
  docCount: number;
  freshness: string;
  topics: string[];
}

interface UseCatalogDataSourcesResult {
  dataSources: CatalogDataSource[];
  isLoading: boolean;
}

/**
 * Fetches data source catalog entries via the data plugin search service.
 * Gracefully degrades if the catalog index does not exist.
 */
export const useCatalogDataSources = (): UseCatalogDataSourcesResult => {
  const [dataSources, setDataSources] = useState<CatalogDataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const {
    data: { search: searchService },
  } = useKibana().services;

  useEffect(() => {
    let cancelled = false;

    const fetchCatalog = async () => {
      try {
        const response = await lastValueFrom(
          searchService.search<
            Record<string, unknown>,
            IKibanaSearchResponse<{ hits: { hits: Array<SearchHit<CatalogHitSource>> } }>
          >({
            params: {
              index: CATALOG_INDEX,
              body: {
                query: { match_all: {} },
                size: 100,
                sort: [{ 'stats.doc_count': { order: 'desc', missing: '_last' } }],
                _source: [
                  'name',
                  'type',
                  'integration.package_title',
                  'integration.description',
                  'mapping.ecs_field_coverage',
                  'stats.doc_count',
                  'stats.freshness_category',
                  'semantic.topics',
                ],
              },
            },
          })
        );

        if (!cancelled && response?.rawResponse?.hits?.hits) {
          const entries = response.rawResponse.hits.hits.map((hit) => {
            const src = hit._source;
            return {
              name: src?.name ?? '',
              type: src?.type ?? '',
              integrationTitle: src?.integration?.package_title,
              integrationDescription: src?.integration?.description,
              ecsFieldCoverage: src?.mapping?.ecs_field_coverage ?? 0,
              docCount: src?.stats?.doc_count ?? 0,
              freshness: src?.stats?.freshness_category ?? 'unknown',
              topics: src?.semantic?.topics ?? [],
            };
          });
          setDataSources(entries);
        }
      } catch {
        // Catalog index may not exist yet — graceful degradation
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchCatalog();
    return () => {
      cancelled = true;
    };
  }, [searchService]);

  return { dataSources, isLoading };
};
