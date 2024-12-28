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
import { indexOrAliasExists } from '../indices/exists_index';

export const generateConnectorName = async (
  client: IScopedClusterClient,
  connectorType: string,
  userConnectorName?: string
): Promise<{ apiKeyName: string; connectorName: string; indexName: string }> => {
  const prefix = toAlphanumeric(connectorType);
  if (!prefix || prefix.length === 0) {
    throw new Error('Connector type or connectorName is required');
  }
  if (userConnectorName) {
    let indexName = `connector-${userConnectorName}`;
    const resultSameName = await indexOrAliasExists(client, indexName);
    // index with same name doesn't exist
    if (!resultSameName) {
      return {
        apiKeyName: userConnectorName,
        connectorName: userConnectorName,
        indexName,
      };
    }
    // if the index name already exists, we will generate until it doesn't for 20 times
    for (let i = 0; i < 20; i++) {
      indexName = `connector-${userConnectorName}-${uuidv4().split('-')[1].slice(0, 4)}`;

      const result = await indexOrAliasExists(client, indexName);
      if (!result) {
        return {
          apiKeyName: indexName,
          connectorName: userConnectorName,
          indexName,
        };
      }
    }
  } else {
    for (let i = 0; i < 20; i++) {
      const connectorName = `${prefix}-${uuidv4().split('-')[1].slice(0, 4)}`;
      const indexName = `connector-${connectorName}`;

      const result = await indexOrAliasExists(client, indexName);
      if (!result) {
        return {
          apiKeyName: indexName,
          connectorName,
          indexName,
        };
      }
    }
  }
  throw new Error(ErrorCode.GENERATE_INDEX_NAME_ERROR);
};
