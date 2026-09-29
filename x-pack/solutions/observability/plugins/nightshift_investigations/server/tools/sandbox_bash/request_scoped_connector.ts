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
 * sandbox reaches this cluster with the API key the current agent run is authenticated with.
 */
export const REQUEST_SCOPED_CONNECTOR_ID = 'nightshift-elasticsearch';

export const REQUEST_SCOPED_CONNECTOR: Readonly<AgentConnector> = Object.freeze({
  id: REQUEST_SCOPED_CONNECTOR_ID,
  name: 'Elasticsearch (this cluster, investigation identity)',
  actionTypeId: '.nightshift-elasticsearch',
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

/** Checks that the virtual connector can be used in this call and returns what it would expose. */
export const checkRequestScopedConnector = (
  callContext: SandboxCallContext,
  elasticsearchUrl: string | undefined
): Resolution<RequestApiKey & { url: string }> => {
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

  const apiKey = readRequestApiKey(callContext.request);
  if ('errorMessage' in apiKey) return apiKey;

  return { ...apiKey, url: elasticsearchUrl };
};
