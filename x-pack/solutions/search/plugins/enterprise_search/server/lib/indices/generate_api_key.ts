/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import {
  ConnectorDocument,
  CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX,
  CONNECTORS_INDEX,
  createConnectorSecret,
  updateConnectorSecret,
} from '@kbn/search-connectors';

import { toAlphanumeric } from '../../../common/utils/to_alphanumeric';

export const generateApiKey = async (
  client: IScopedClusterClient,
  indexName: string,
  isNative: boolean
) => {
  const aclIndexName = `${CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX}${indexName}`;

  const apiKeyResult = await client.asCurrentUser.security.createApiKey({
    name: `${indexName}-connector`,
    role_descriptors: {
      [`${toAlphanumeric(indexName)}-connector-role`]: {
        cluster: ['monitor', 'manage_connector'],
        index: [
          {
            names: [indexName, aclIndexName, `${CONNECTORS_INDEX}*`],
            privileges: ['all'],
          },
        ],
      },
    },
  });

  const connectorResult = await client.asCurrentUser.search<ConnectorDocument>({
    index: CONNECTORS_INDEX,
    query: { term: { index_name: indexName } },
  });
  const connector = connectorResult.hits.hits[0];
  if (connector) {
    const apiKeyFields = isNative
      ? {
          api_key_id: apiKeyResult.id,
          api_key_secret_id: await storeConnectorSecret(
            client,
            apiKeyResult.encoded,
            connector._source?.api_key_secret_id || null
          ),
        }
      : {
          api_key_id: apiKeyResult.id,
        };

    if (connector._source?.api_key_id) {
      await client.asCurrentUser.security.invalidateApiKey({ ids: [connector._source.api_key_id] });
    }
    await client.asCurrentUser.index({
      document: {
        ...connector._source,
        ...apiKeyFields,
      },
      id: connector._id,
      index: CONNECTORS_INDEX,
    });
  }
  return apiKeyResult;
};

const storeConnectorSecret = async (
  client: IScopedClusterClient,
  value: string,
  secretId: string | null
) => {
  if (secretId === null) {
    const connectorSecretResult = await createConnectorSecret(client.asCurrentUser, value);
    return connectorSecretResult.id;
  }

  await updateConnectorSecret(client.asCurrentUser, value, secretId);
  return secretId;
};
