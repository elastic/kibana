/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { checkIndicesPrivileges } from '../routes/results/privileges';

export const getAuthorizedIndexNames = async (
  client: IScopedClusterClient,
  pattern: string
): Promise<string[]> => {
  // Discover all indices for the pattern using internal user
  const indicesResponse = await client.asInternalUser.indices.get({
    index: pattern,
    features: 'aliases', // omit 'settings' and 'mappings' to reduce response size
  });

  // map data streams to their backing indices and collect indices to authorize
  const indicesToAuthorize: string[] = [];
  const dataStreamIndices: Record<string, string[]> = {};
  Object.entries(indicesResponse).forEach(([indexName, { data_stream: dataStream }]) => {
    if (dataStream) {
      if (!dataStreamIndices[dataStream]) {
        dataStreamIndices[dataStream] = [];
      }
      dataStreamIndices[dataStream].push(indexName);
    } else {
      indicesToAuthorize.push(indexName);
    }
  });
  indicesToAuthorize.push(...Object.keys(dataStreamIndices));
  if (indicesToAuthorize.length === 0) {
    return [];
  }

  // check privileges for indices or data streams
  const hasIndexPrivileges = await checkIndicesPrivileges({
    client,
    indices: indicesToAuthorize,
  });

  // filter out unauthorized indices, and expand data streams backing indices
  return Object.entries(hasIndexPrivileges).reduce<string[]>((acc, [indexName, authorized]) => {
    if (authorized) {
      if (dataStreamIndices[indexName]) {
        acc.push(...dataStreamIndices[indexName]);
      } else {
        acc.push(indexName);
      }
    }
    return acc;
  }, []);
};
