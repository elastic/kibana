/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { FakeRawRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { asSpaceId } from '@kbn/core-spaces-common';

/**
 * Lifetime of the granted API key. Exceeds the pipeline's own budget so a run
 * is never cut short by the key, while still bounding how long the credential
 * remains usable if the process terminates before it can be invalidated.
 */
export const PIPELINE_API_KEY_EXPIRATION = '1h';

export interface CreatePipelineRequestParams {
  coreStart: CoreStart;
  executionUuid: string;
  logger: Logger;
  request: KibanaRequest;
  spaceId: string;
}

export interface PipelineRequest {
  /** Id of the granted API key, or `undefined` when no key was granted. */
  apiKeyId: string | undefined;
  request: KibanaRequest;
}

/**
 * Returns a request the generation pipeline can use for the whole of a run,
 * together with the id of any API key granted to build it.
 *
 * An interactive request carries the caller's session credential, whose lifetime
 * is set by the session rather than by the run. This exchanges that credential
 * for an Elasticsearch API key and returns a fake request carrying the key,
 * bound to `spaceId`. Empty role descriptors make Elasticsearch clamp the key to
 * the privileges the caller holds at the moment of the grant.
 *
 * Requests that are already fake carry a credential of their own and are
 * returned unchanged, as is the incoming request when no key can be granted.
 */
export const createPipelineRequest = async ({
  coreStart,
  executionUuid,
  logger,
  request,
  spaceId,
}: CreatePipelineRequestParams): Promise<PipelineRequest> => {
  if (request.isFakeRequest) {
    return { apiKeyId: undefined, request };
  }

  const name = `attack-discovery-${executionUuid}`;

  try {
    const grant = await coreStart.security.authc.apiKeys.grantAsInternalUser(request, {
      expiration: PIPELINE_API_KEY_EXPIRATION,
      metadata: { managed: true },
      name,
      role_descriptors: {},
    });

    if (grant == null) {
      logger.warn(
        `Could not grant pipeline API key ${name}; continuing with the incoming credential`
      );

      return { apiKeyId: undefined, request };
    }

    const credential = Buffer.from(`${grant.id}:${grant.api_key}`).toString('base64');

    const fakeRawRequest: FakeRawRequest = {
      headers: { authorization: `ApiKey ${credential}` },
      path: '/',
      spaceId: asSpaceId(spaceId),
    };

    logger.debug(() => `Granted pipeline API key ${name} (${grant.id})`);

    return { apiKeyId: grant.id, request: kibanaRequestFactory(fakeRawRequest) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.warn(
      `Could not grant pipeline API key ${name}; continuing with the incoming credential: ${message}`
    );

    return { apiKeyId: undefined, request };
  }
};
