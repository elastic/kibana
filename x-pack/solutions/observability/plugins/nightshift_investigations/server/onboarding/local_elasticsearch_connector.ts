/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, forbidden } from '@hapi/boom';
import { v4 as uuidv4, validate as isUuid } from 'uuid';
import type { ActionsClient, ConnectorLifecycleListener } from '@kbn/actions-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { connectorsSpecs } from '@kbn/connector-specs';
import type { ElasticsearchClient, ElasticsearchServiceStart, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { OnboardingUnavailableError } from './errors';

const LOCAL_ELASTICSEARCH_CONNECTOR_TYPE_ID = connectorsSpecs.Elasticsearch.metadata.id;
const LOCAL_ELASTICSEARCH_CONNECTOR_NAME = 'Local Elasticsearch';

const LOCAL_ELASTICSEARCH_API_KEY_ROLE_DESCRIPTORS = {
  nightshift_local_read: {
    cluster: [],
    indices: [
      {
        names: ['logs-*', 'metrics-*', 'traces-*'],
        privileges: ['read', 'view_index_metadata'],
        allow_restricted_indices: false,
      },
    ],
  },
};

const normalizeUrl = (value: string): string => {
  const url = new URL(value);
  url.username = '';
  url.password = '';
  return url.toString().replace(/\/+$/, '');
};

const normalizeUrlOrUndefined = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  try {
    return normalizeUrl(value);
  } catch {
    return undefined;
  }
};

interface LocalElasticsearchUrlDeps {
  cloud?: Pick<CloudSetup, 'elasticsearchUrl'>;
  elasticsearch?: Pick<ElasticsearchServiceStart, 'publicBaseUrl'>;
  esHosts?: string[];
}

export const resolveLocalElasticsearchUrl = ({
  cloud,
  elasticsearch,
  esHosts,
}: LocalElasticsearchUrlDeps): string => {
  const candidate = cloud?.elasticsearchUrl || elasticsearch?.publicBaseUrl || esHosts?.[0];
  const url = normalizeUrlOrUndefined(candidate);
  if (!url) {
    throw new OnboardingUnavailableError('The Elasticsearch URL could not be resolved');
  }
  return url;
};

/**
 * The key is named after the connector it belongs to, so it can be found when the connector is
 * deleted. Kibana's internal user may invalidate any key but cannot read other users' keys, so the
 * name is the only lookup that works whoever created the key.
 */
export const getLocalElasticsearchApiKeyName = (connectorId: string): string =>
  `nightshift-local-elasticsearch-${connectorId}`;

const createReadOnlyApiKey = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  connectorId: string
) => {
  try {
    return await esClient.security.createApiKey({
      name: getLocalElasticsearchApiKeyName(connectorId),
      role_descriptors: LOCAL_ELASTICSEARCH_API_KEY_ROLE_DESCRIPTORS,
      metadata: {
        managed: true,
        application: 'nightshift',
        space_id: spaceId,
        connector_id: connectorId,
      },
    });
  } catch (error) {
    if (isResponseError(error) && (error.statusCode === 400 || error.statusCode === 403)) {
      const reason =
        (error.body as { error?: { reason?: string } } | undefined)?.error?.reason ?? error.message;
      const message = `Could not create the Elasticsearch API key for the local connector: ${reason}`;
      throw error.statusCode === 403 ? forbidden(message) : badRequest(message);
    }
    throw error;
  }
};

export const createLocalElasticsearchConnector = async ({
  esClient,
  actionsClient,
  spaceId,
  url,
  logger,
}: {
  esClient: ElasticsearchClient;
  actionsClient: Pick<ActionsClient, 'create'>;
  spaceId: string;
  url: string;
  logger: Logger;
}): Promise<string> => {
  // The id is chosen up front so the API key can be named after the connector.
  const connectorId = uuidv4();
  const apiKey = await createReadOnlyApiKey(esClient, spaceId, connectorId);
  try {
    const connector = await actionsClient.create({
      options: { id: connectorId },
      action: {
        actionTypeId: LOCAL_ELASTICSEARCH_CONNECTOR_TYPE_ID,
        name: LOCAL_ELASTICSEARCH_CONNECTOR_NAME,
        config: { url, selectedActions: ['_test'] },
        secrets: { authType: 'api_key_header', Authorization: `ApiKey ${apiKey.encoded}` },
      },
    });
    return connector.id;
  } catch (error) {
    try {
      await esClient.security.invalidateApiKey({ ids: [apiKey.id] });
    } catch (invalidateError) {
      logger.warn(
        `Could not invalidate API key "${apiKey.id}": ${(invalidateError as Error).message}`
      );
    }
    throw error;
  }
};

/**
 * Invalidates the API key of a deleted local Elasticsearch connector, whichever interface deleted
 * it. Runs as Kibana's internal user because the person deleting the connector may not own the key.
 * Connectors that were not created by onboarding have no matching key, so nothing is invalidated.
 */
export const createLocalElasticsearchConnectorLifecycleListener = ({
  getInternalEsClient,
  logger,
}: {
  getInternalEsClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
}): ConnectorLifecycleListener => ({
  connectorTypes: [LOCAL_ELASTICSEARCH_CONNECTOR_TYPE_ID],
  onPostDelete: async ({ connectorId }) => {
    if (!isUuid(connectorId)) return;
    const name = getLocalElasticsearchApiKeyName(connectorId);
    try {
      const esClient = await getInternalEsClient();
      const {
        invalidated_api_keys: invalidated,
        error_count: errorCount,
        error_details: errorDetails,
      } = await esClient.security.invalidateApiKey({ name });
      if (errorCount > 0) {
        const reasons = (errorDetails ?? []).map((detail) => detail.reason).join('; ');
        logger.warn(
          `Could not invalidate API key "${name}" of deleted connector "${connectorId}": ${reasons}`
        );
      } else if (invalidated.length > 0) {
        logger.info(
          `Invalidated the API key of deleted local Elasticsearch connector "${connectorId}"`
        );
      }
    } catch (error) {
      logger.warn(
        `Could not invalidate API key "${name}" of deleted connector "${connectorId}": ${
          (error as Error).message
        }`
      );
    }
  },
});
