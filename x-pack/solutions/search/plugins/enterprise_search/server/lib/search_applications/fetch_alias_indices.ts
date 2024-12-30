/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

export const fetchAliasIndices = async (client: IScopedClusterClient, aliasName: string) => {
  const aliasIndices = await client.asCurrentUser.indices.getAlias({
    name: aliasName,
  });

  return Object.keys(aliasIndices).sort();
};
