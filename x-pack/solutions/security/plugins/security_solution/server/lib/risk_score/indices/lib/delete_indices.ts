/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

export const deleteEsIndices = async ({
  client,
  indices,
}: {
  client: IScopedClusterClient;
  indices: string[];
}) => {
  const params = {
    expand_wildcards: 'none' as const,
    format: 'json',
    index: indices,
  };
  await client.asCurrentUser.indices.delete(params);
};
