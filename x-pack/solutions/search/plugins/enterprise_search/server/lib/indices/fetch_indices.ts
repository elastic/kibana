/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpandWildcard } from '@elastic/elasticsearch/lib/api/types';
import {
  IndicesGetResponse,
  SecurityHasPrivilegesPrivileges,
  IndicesStatsIndicesStats,
} from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';

import { AlwaysShowPattern, ElasticsearchIndexWithPrivileges } from '../../../common/types/indices';
import { isNotNullish } from '../../../common/utils/is_not_nullish';

import { fetchIndexCounts } from './fetch_index_counts';
import { fetchIndexPrivileges } from './fetch_index_privileges';
import { fetchIndexStats } from './fetch_index_stats';
import { expandAliases, getAlwaysShowAliases } from './utils/extract_always_show_indices';
import { getIndexDataMapper } from './utils/get_index_data';
import { getIndexData, getSearchIndexData } from './utils/get_index_data';

export interface TotalIndexData {
  allIndexMatches: IndicesGetResponse;
  indexCounts: Record<string, number>;
  indexPrivileges: Record<string, SecurityHasPrivilegesPrivileges>;
  indicesStats: Record<string, IndicesStatsIndicesStats>;
}

export const fetchSearchIndices = async (
  client: IScopedClusterClient,
  alwaysShowPattern: AlwaysShowPattern
) => {
  const expandWildcards: ExpandWildcard[] =
    alwaysShowPattern.alias_pattern || alwaysShowPattern.index_pattern
      ? ['hidden', 'all']
      : ['open'];

  const { allIndexMatches, indexAndAliasNames, indicesNames, alwaysShowMatchNames } =
    await getSearchIndexData(client, '*', expandWildcards, false, true, alwaysShowPattern);

  if (indicesNames.length === 0) {
    return [];
  }

  const indicesStats = await fetchIndexStats(client, '*', expandWildcards);

  const indexPrivileges = await fetchIndexPrivileges(client, indexAndAliasNames);

  const indexCounts = await fetchIndexCounts(client, indexAndAliasNames);
  const totalIndexData: TotalIndexData = {
    allIndexMatches,
    indexCounts,
    indexPrivileges,
    indicesStats,
  };

  const regularIndexData = indicesNames
    .map(getIndexDataMapper(totalIndexData))
    .flatMap(({ name, aliases, ...indexData }) => {
      // expand aliases and add to results

      const indexEntry = {
        ...indexData,
        alias: false,
        count: indexCounts[name] ?? 0,
        name,
        privileges: { manage: false, read: false, ...indexPrivileges[name] },
      };
      return [
        indexEntry,
        ...expandAliases(
          name,
          aliases,
          indexData,
          totalIndexData,
          ...(name.startsWith('.ent-search-engine-documents') ? [alwaysShowPattern] : [])
        ),
      ];
    });

  let indicesData = regularIndexData;

  if (alwaysShowPattern?.alias_pattern) {
    const indexNamesAlreadyIncluded = regularIndexData.map(({ name }) => name);

    const itemsToInclude = getAlwaysShowAliases(indexNamesAlreadyIncluded, alwaysShowMatchNames)
      .map(getIndexDataMapper(totalIndexData))
      .flatMap(({ name, aliases, ...indexData }) => {
        return expandAliases(name, aliases, indexData, totalIndexData, alwaysShowPattern);
      });

    indicesData = [...indicesData, ...itemsToInclude];
  }

  return indicesData.filter(
    ({ name }, index, array) =>
      // make list of aliases unique since we add an alias per index above
      // and aliases can point to multiple indices
      array.findIndex((engineData) => engineData.name === name) === index
  );
};

export const fetchIndices = async (
  client: IScopedClusterClient,
  searchQuery: string | undefined,
  returnHiddenIndices: boolean,
  onlyShowSearchOptimizedIndices: boolean,
  from: number,
  size: number
): Promise<{
  indexNames: string[];
  indices: ElasticsearchIndexWithPrivileges[];
  totalResults: number;
}> => {
  const { indexData, indexNames } = await getIndexData(
    client,
    onlyShowSearchOptimizedIndices,
    returnHiddenIndices,
    searchQuery
  );
  const indexNameSlice = indexNames.slice(from, from + size).filter(isNotNullish);
  if (indexNameSlice.length === 0) {
    return {
      indexNames: [],
      indices: [],
      totalResults: indexNames.length,
    };
  }

  const { indices: indicesStats = {} } = await client.asCurrentUser.indices.stats({
    index: indexNameSlice,
    metric: ['docs', 'store'],
  });

  const indexPrivileges = await fetchIndexPrivileges(client, indexNameSlice);

  const indexCounts = await fetchIndexCounts(client, indexNameSlice);

  const totalIndexData: TotalIndexData = {
    allIndexMatches: indexData,
    indexCounts,
    indexPrivileges,
    indicesStats,
  };

  const indices = indexNameSlice
    .map(getIndexDataMapper(totalIndexData))
    .map(({ name, ...index }) => {
      return {
        ...index,
        alias: false,
        count: indexCounts[name] ?? 0,
        name,
        privileges: { manage: false, read: false, ...indexPrivileges[name] },
      };
    });

  return {
    indexNames: indexNameSlice,
    indices,
    totalResults: indexNames.length,
  };
};
