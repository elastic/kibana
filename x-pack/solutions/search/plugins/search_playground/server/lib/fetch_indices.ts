/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesIndexState } from '@elastic/elasticsearch/lib/api/types';

import { ElasticsearchClient } from '@kbn/core/server';

function isHidden(index: IndicesIndexState): boolean {
  return index.settings?.index?.hidden === true || index.settings?.index?.hidden === 'true';
}
function isClosed(index: IndicesIndexState): boolean {
  return (
    index.settings?.index?.verified_before_close === true ||
    index.settings?.index?.verified_before_close === 'true'
  );
}

export const fetchIndices = async (
  client: ElasticsearchClient,
  searchQuery: string | undefined,
  { exact }: { exact?: boolean } = { exact: false }
): Promise<{
  indexNames: string[];
}> => {
  const indexPattern = exact && searchQuery ? searchQuery : searchQuery ? `*${searchQuery}*` : '*';
  const allIndexMatches = await client.indices.get({
    expand_wildcards: ['open'],
    // for better performance only compute aliases and settings of indices but not mappings
    features: ['aliases', 'settings'],
    // only get specified index properties from ES to keep the response under 536MB
    // node.js string length limit: https://github.com/nodejs/node/issues/33960
    filter_path: ['*.aliases', '*.settings.index.hidden', '*.settings.index.verified_before_close'],
    index: indexPattern,
  });

  const allIndexNames = Object.keys(allIndexMatches).filter(
    (indexName) =>
      allIndexMatches[indexName] &&
      !isHidden(allIndexMatches[indexName]) &&
      !isClosed(allIndexMatches[indexName])
  );

  const allAliases = allIndexNames.reduce<string[]>((acc, indexName) => {
    const aliases = allIndexMatches[indexName].aliases;
    if (aliases) {
      Object.keys(aliases).forEach((alias) => {
        if (!acc.includes(alias)) {
          acc.push(alias);
        }
      });
    }
    return acc;
  }, []);

  const allOptions = [...allIndexNames, ...allAliases];

  const indexNames = searchQuery
    ? allOptions.filter((indexName) => indexName.includes(searchQuery.toLowerCase()))
    : allOptions;

  return {
    indexNames,
  };
};
