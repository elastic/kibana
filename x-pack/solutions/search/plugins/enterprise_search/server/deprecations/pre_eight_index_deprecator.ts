/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

const ENT_SEARCH_INDEX_PREFIX = '.ent-search-';

export interface EnterpriseSearchIndexMapping {
  name: string;
  isDatastream: boolean;
  datastreamName: string;
}

export async function getPreEightEnterpriseSearchIndices(
  esClient: ElasticsearchClient
): Promise<EnterpriseSearchIndexMapping[]> {
  const entSearchIndices = await esClient.indices.get({
    index: `${ENT_SEARCH_INDEX_PREFIX}*`,
    ignore_unavailable: true,
    expand_wildcards: ['all'],
  });

  if (!entSearchIndices) {
    return [];
  }

  const returnIndices: EnterpriseSearchIndexMapping[] = [];
  for (const [index, indexData] of Object.entries(entSearchIndices)) {
    if (
      indexData.settings?.index?.version?.created?.startsWith('7') &&
      indexData.settings?.index?.blocks?.write !== 'true'
    ) {
      const dataStreamName = indexData.data_stream;
      returnIndices.push({
        name: index,
        isDatastream: dataStreamName ? true : false,
        datastreamName: dataStreamName ?? '',
      });
    }
  }

  return returnIndices;
}

export async function setPreEightEnterpriseSearchIndicesReadOnly(
  esClient: ElasticsearchClient
): Promise<string> {
  // get the indices again to ensure nothing's changed since the last check
  let indices = await getPreEightEnterpriseSearchIndices(esClient);

  // rollover any datastreams first
  const rolledOverDatastreams: { [id: string]: boolean } = {};
  for (const index of indices) {
    if (index.isDatastream && !rolledOverDatastreams[index.datastreamName]) {
      const indexResponse = await esClient.indices.rollover({ alias: index.datastreamName });

      if (!indexResponse) {
        return `Could not roll over datastream: ${index.name}`;
      }

      rolledOverDatastreams[index.datastreamName] = true;
    }
  }

  if (Object.keys(rolledOverDatastreams).length > 0) {
    // we rolled over at least one datastream,
    // get the indices again
    indices = await getPreEightEnterpriseSearchIndices(esClient);
  }

  for (const index of indices) {
    const indexName = index.name;
    const indexResponse = await esClient.indices.addBlock({ index: indexName, block: 'write' });

    if (!indexResponse || indexResponse.acknowledged !== true) {
      return `Could not set index read-only: ${indexName}`;
    }
  }

  return '';
}
