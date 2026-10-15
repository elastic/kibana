/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';
import type { AgentConnector } from './agent_connectors';
import type { SandboxCallContext } from './tool_utils';

/**
 * Id of the virtual Elasticsearch connector. It does not exist in the actions framework: the
 * sandbox reaches this cluster either as a UIAM service account assumed by sandbox-api, or with
 * the API key the current agent run is authenticated with.
 */
export const REQUEST_SCOPED_CONNECTOR_ID = 'nightshift-elasticsearch';

export const REQUEST_SCOPED_CONNECTOR: Readonly<AgentConnector> = Object.freeze({
  id: REQUEST_SCOPED_CONNECTOR_ID,
  name: 'Elasticsearch (this cluster, investigation identity)',
  actionTypeId: '.nightshift-elasticsearch',
  usage:
    'Exposes `ELASTICSEARCH_URL` and `ELASTICSEARCH_AUTHORIZATION` rather than `CONNECTOR_CONFIG_*` / ' +
    '`CONNECTOR_SECRET_*`; see `/workspace/elastic.md`. Always call it as ' +
    '`curl -sS -H "Authorization: ${ELASTICSEARCH_AUTHORIZATION}" "$ELASTICSEARCH_URL/_query" ...`.',
});

interface RequestApiKey {
  /** `base64(id:secret)`, ready for `Authorization: ApiKey <value>`. */
  encoded: string;
  secret: string;
}

type Resolution<T> = T | { errorMessage: string };

/**
 * Reads the Elasticsearch API key the request is authenticated with. Only fake requests qualify:
 * their key is the one Task Manager minted for this run and revokes after it ends, so a
 * user's own long-lived credential never reaches the sandbox.
 */
export const readRequestApiKey = (request: KibanaRequest): Resolution<RequestApiKey> => {
  if (!request.isFakeRequest) {
    return {
      errorMessage:
        'The Elasticsearch connector is only available to runs executed by Task Manager.',
    };
  }

  const authorization = HTTPAuthorizationHeader.parseFromRequest(request);
  if (!authorization || authorization.scheme.toLowerCase() !== 'apikey') {
    return { errorMessage: 'The current run is not authenticated with an API key.' };
  }

  // Kibana-minted UIAM keys only authenticate together with Kibana's UIAM shared secret, which
  // must never enter the sandbox.
  if (isUiamCredential(authorization)) {
    return {
      errorMessage:
        'The current run is authenticated with a Cloud (UIAM) API key, which cannot be used from the sandbox.',
    };
  }

  const { credentials } = authorization;
  const [id, secret] = Buffer.from(credentials, 'base64').toString().split(':');
  if (!id || !secret) {
    return { errorMessage: 'The current run carries a malformed API key.' };
  }

  return { encoded: credentials, secret };
};

/** How the sandbox reaches this cluster in one command. */
export type RequestScopedConnectorAccess =
  /** sandbox-api assumes the service account; Kibana sends only its id and the URL. */
  | { mode: 'uiam'; url: string; serviceAccountId: string }
  /** The run's own API key is injected into the command's environment. */
  | ({ mode: 'api_key'; url: string } & RequestApiKey);

/**
 * Checks that the virtual connector can be used in this call and returns how. UIAM mode wins once
 * `getUiamServiceAccountId` (set only when UIAM mode is configured) resolves an account; otherwise
 * the run's own API key is used.
 */
export const checkRequestScopedConnector = async (
  callContext: SandboxCallContext,
  elasticsearchUrl: string | undefined,
  getUiamServiceAccountId?: () => Promise<string | undefined>
): Promise<Resolution<RequestScopedConnectorAccess>> => {
  if (!callContext.allowedConnectorIds.includes(REQUEST_SCOPED_CONNECTOR_ID)) {
    return {
      errorMessage: `Connector '${REQUEST_SCOPED_CONNECTOR_ID}' is not assigned to this agent.`,
    };
  }

  if (!elasticsearchUrl) {
    return {
      errorMessage:
        'No Elasticsearch URL is configured for the sandbox. Set ' +
        'xpack.nightshift_investigations.sandbox.elasticsearch.url or elasticsearch.publicBaseUrl.',
    };
  }

  const serviceAccountId = await getUiamServiceAccountId?.();
  if (serviceAccountId) {
    return { mode: 'uiam', url: elasticsearchUrl, serviceAccountId };
  }

  const apiKey = readRequestApiKey(callContext.request);
  if ('errorMessage' in apiKey) return apiKey;

  return { mode: 'api_key', ...apiKey, url: elasticsearchUrl };
};
