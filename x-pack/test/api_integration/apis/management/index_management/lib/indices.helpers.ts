/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRandomString } from './random';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export function indicesHelpers(getService: FtrProviderContext['getService']) {
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  let indicesCreated: string[] = [];

  const createIndex = async (index: string = getRandomString(), mappings?: any) => {
    indicesCreated.push(index);
    await es.indices.create({ index, mappings });
    return index;
  };

  const deleteAllIndices = async () => {
    await esDeleteAllIndices(indicesCreated);
    indicesCreated = [];
  };

  const catIndex = (index?: string, h?: any) =>
    es.cat.indices({ index, format: 'json', h }, { meta: true });

  const indexStats = (index: string, metric: string) =>
    es.indices.stats({ index, metric }, { meta: true });

  return { createIndex, deleteAllIndices, catIndex, indexStats };
}
