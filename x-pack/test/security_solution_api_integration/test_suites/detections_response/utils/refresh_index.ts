/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

/**
 * Refresh an index, making changes available to search.
 * Useful for tests where we want to ensure that a rule does NOT create alerts, e.g. testing exceptions.
 * @param es The ElasticSearch handle
 */
export const refreshIndex = async (es: Client, index?: string) => {
  await es.indices.refresh({
    index,
  });
};
