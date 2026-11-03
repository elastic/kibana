/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, forbidden } from '@hapi/boom';
import type { ActionsClient } from '@kbn/actions-plugin/server';
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
    indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
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

const findLocalElasticsearchConnectorId = async ({
  actionsClient,
  url,
}: {
  actionsClient: Pick<ActionsClient, 'getAll'>;
  url: string;
}): Promise<string | undefined> => {
  // Only connectors the sandbox can use; every `.elasticsearch` auth type is sandbox capable.
  const connectors = await actionsClient.getAll({
    includeSystemActions: false,
    sandboxCapableOnly: true,
  });
  return connectors.find(
    (connector) =>
      connector.actionTypeId === LOCAL_ELASTICSEARCH_CONNECTOR_TYPE_ID &&
      normalizeUrlOrUndefined(connector.config?.url) === url
  )?.id;
};

const createReadOnlyApiKey = async (esClient: ElasticsearchClient, spaceId: string) => {
  try {
    return await esClient.security.createApiKey({
      name: `nightshift-local-elasticsearch-${spaceId}`,
      role_descriptors: LOCAL_ELASTICSEARCH_API_KEY_ROLE_DESCRIPTORS,
      metadata: { managed: true, application: 'nightshift', space_id: spaceId },
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

export const ensureLocalElasticsearchConnector = async ({
  esClient,
  actionsClient,
  spaceId,
  url,
  logger,
}: {
  esClient: ElasticsearchClient;
  actionsClient: Pick<ActionsClient, 'getAll' | 'create'>;
  spaceId: string;
  url: string;
  logger: Logger;
}): Promise<string> => {
  const existingId = await findLocalElasticsearchConnectorId({ actionsClient, url });
  if (existingId) {
    return existingId;
  }

  const apiKey = await createReadOnlyApiKey(esClient, spaceId);
  try {
    const connector = await actionsClient.create({
      action: {
        actionTypeId: LOCAL_ELASTICSEARCH_CONNECTOR_TYPE_ID,
        name: LOCAL_ELASTICSEARCH_CONNECTOR_NAME,
        config: { url },
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
