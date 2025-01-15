/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { GetService } from '../../types';

export const cleanupRegistryIndices = async (getService: GetService, client: IRuleDataClient) => {
  const es = getService('es');
  const aliasMap = await es.indices.get({
    index: `${client.indexName}*`,
    allow_no_indices: true,
    expand_wildcards: 'open',
  });
  const indices = Object.keys(aliasMap);
  expect(indices.length > 0).to.be(true);
  return es.indices.delete({ index: indices }, { ignore: [404] });
};
