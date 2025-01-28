/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, takeUntil } from 'rxjs';

import type { IStaticAssets } from '@kbn/core-http-browser';
import {
  GlobalSearchProviderResult,
  GlobalSearchResultProvider,
} from '@kbn/global-search-plugin/server';
import { i18n } from '@kbn/i18n';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../common/constants';

import { getIndexData } from '../lib/indices/utils/get_index_data';

import { calculateScore } from './calculate_search_score';

export function getIndicesSearchResultProvider(
  staticAssets: IStaticAssets
): GlobalSearchResultProvider {
  return {
    find: ({ term, types, tags }, { aborted$, client, maxResults }) => {
      if (!client || !term || tags || (types && !types.includes('indices'))) {
        return from([[]]);
      }
      const fetchIndices = async (): Promise<GlobalSearchProviderResult[]> => {
        const { indexNames } = await getIndexData(client, false, false, term);

        const searchResults: GlobalSearchProviderResult[] = indexNames
          .map((indexName) => {
            const score = calculateScore(term, indexName);

            return {
              icon: staticAssets.getPluginAssetHref('images/index.svg'),
              id: indexName,
              score,
              title: indexName,
              type: i18n.translate('xpack.enterpriseSearch.searchIndexProvider.type.name', {
                defaultMessage: 'Index',
              }),
              url: {
                path: `${ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL}/search_indices/${indexName}`,
                prependBasePath: true,
              },
            };
          })
          .filter(({ score }) => score > 0)
          .slice(0, maxResults);
        return searchResults;
      };
      return from(fetchIndices()).pipe(takeUntil(aborted$));
    },
    getSearchableTypes: () => ['indices'],
    id: 'enterpriseSearchIndices',
  };
}
