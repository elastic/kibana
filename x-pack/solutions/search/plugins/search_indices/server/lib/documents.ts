/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';

export async function deleteDocument(
  client: ElasticsearchClient,
  logger: Logger,
  index: string,
  id: string
): Promise<boolean> {
  await client.delete({
    index,
    id,
  });
  return true;
}
