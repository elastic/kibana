/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { ErrorCode } from '../../../common/types/error_codes';

import { toAlphanumeric } from '../../../common/utils/to_alphanumeric';

import { indexOrAliasExists } from './exists_index';

export const generatedIndexName = async (client: IScopedClusterClient, indexNamePrefix: string) => {
  const prefix = toAlphanumeric(indexNamePrefix);
  if (!prefix || prefix.length === 0) {
    throw new Error('Index name prefix is required');
  }
  for (let i = 0; i < 20; i++) {
    const indexName = `${prefix}-${uuidv4().split('-')[0]}`;
    const result = await indexOrAliasExists(client, indexName);
    if (!result) {
      return indexName;
    }
  }
  throw new Error(ErrorCode.GENERATE_INDEX_NAME_ERROR);
};
