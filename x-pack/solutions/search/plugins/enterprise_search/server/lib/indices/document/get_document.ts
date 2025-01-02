/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';

export const getDocument = async (
  client: IScopedClusterClient,
  indexName: string,
  documentId: string
): Promise<GetResponse<unknown>> => {
  const response = await client.asCurrentUser.get({
    id: documentId,
    index: indexName,
  });
  return response;
};
