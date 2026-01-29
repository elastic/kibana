/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';

export const deleteAllDocuments = async (es: EsClient, index: string) => {
  await es.deleteByQuery({
    index,
    query: { match_all: {} },
    refresh: true,
  });
};
