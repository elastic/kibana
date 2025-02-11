/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from "@kbn/core/server";

const ENT_SEARCH_INDEX_PREFIX = '.ent-search-';

/**
 * This function will return all Enterprise Search indices that were created with Elasticsearch 7.x. 
 * @param esClient an ElasticsearchClient instance
 * @returns a list of Enterprise Search index names that were created with Elasticsearch 7.x.
 */
export async function getPreEightEnterpriseSearchIndices(esClient: ElasticsearchClient): Promise<string[]> {

  const entSearchIndices = await esClient.indices.get({
    index: `${ENT_SEARCH_INDEX_PREFIX}*`,
    features: ['aliases', 'settings'],
    ignore_unavailable: true,
    expand_wildcards: ['all'],
  });

  if (!entSearchIndices) {
    return [];
  }

  let returnIndices: string[] = [];
  for (const [index, indexData] of Object.entries(entSearchIndices)) {
    if (indexData.settings?.index?.version?.created?.startsWith('7') && indexData.settings?.index?.blocks?.write !== 'true') {
      returnIndices.push(index);
    }
  }

  return returnIndices;
}
    

export async function setPreEightEnterpriseSearchIndicesReadOnly(esClient: ElasticsearchClient): Promise<boolean> {
  // get the indices again to ensure nothing's changed since the last check
  const indices = await getPreEightEnterpriseSearchIndices(esClient);

  const body = {
    settings: {
      'index.blocks.read_only': true
    }
  };

  for (const index of indices) {
    let indexResponse = await esClient.indices.putSettings({
      index,
      body,
    });

    if (!indexResponse || indexResponse.acknowledged !== true) {
      return false;
    }
  }  

  return true;
}

