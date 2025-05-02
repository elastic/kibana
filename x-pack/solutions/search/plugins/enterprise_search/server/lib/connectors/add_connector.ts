/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import {
  createConnector,
  Connector,
  ConnectorStatus,
  deleteConnectorById,
} from '@kbn/search-connectors';

import { fetchConnectorByIndexName, NATIVE_CONNECTOR_DEFINITIONS } from '@kbn/search-connectors';

import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '../../../common/constants';

import { ErrorCode } from '../../../common/types/error_codes';

import { createIndex } from '../indices/create_index';
import { generateApiKey } from '../indices/generate_api_key';
import { getDefaultPipeline } from '../pipelines/get_default_pipeline';

export const addConnector = async (
  client: IScopedClusterClient,
  input: {
    deleteExistingConnector?: boolean;
    indexName: string | null;
    isNative: boolean;
    language: string | null;
    name: string | null;
    serviceType?: string | null;
  }
): Promise<Connector> => {
  const index = input.indexName;
  if (index) {
    const indexExists = await client.asCurrentUser.indices.exists({ index });
    if (indexExists) {
      {
        throw new Error(ErrorCode.INDEX_ALREADY_EXISTS);
      }
    }

    const connector = await fetchConnectorByIndexName(client.asCurrentUser, index);
    if (connector) {
      if (input.deleteExistingConnector) {
        await deleteConnectorById(client.asCurrentUser, connector.id);
      } else {
        throw new Error(ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS);
      }
    }

    await createIndex(client, index, input.language, false);
  }

  const nativeConnector =
    input.isNative && input.serviceType
      ? NATIVE_CONNECTOR_DEFINITIONS[input.serviceType]
      : undefined;

  if (
    input.isNative &&
    input.serviceType &&
    !nativeConnector &&
    input.serviceType !== ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE
  ) {
    throw new Error(`Could not find connector definition for service type ${input.serviceType}`);
  }

  const nativeFields = nativeConnector
    ? {
        configuration: nativeConnector.configuration,
        features: nativeConnector.features,
        status: ConnectorStatus.NEEDS_CONFIGURATION,
      }
    : {};

  const connector = await createConnector(client.asCurrentUser, {
    ...input,
    name: input.name || '',
    ...nativeFields,
    pipeline: await getDefaultPipeline(client),
  });

  // Only create API key for native connectors and if index name was provided
  if (
    index &&
    input.isNative &&
    input.serviceType !== ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE
  ) {
    await generateApiKey(client, index, true);
  }

  return connector;
};
