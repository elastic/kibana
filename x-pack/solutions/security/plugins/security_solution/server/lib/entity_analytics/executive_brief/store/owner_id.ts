/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { extractApiKeyIdFromAuthzHeader } from '@kbn/core-security-server';

/** The subset of the authenticated user needed to derive a stable id. */
export interface StableUserIdAuthUser {
  username?: string;
  profile_uid?: string;
  authentication_type?: string;
  authentication_realm?: { type?: string; name?: string };
}

export interface BriefOwner {
  /** Stable principal id: profile uid, or `realm:[type,name,username]`. */
  id: string;
}

/**
 * Builds a stable principal id (ported from Agent Builder's `toStableUserId`). Usernames are not
 * unique across realms, so prefer the profile uid and otherwise encode realm type and name with
 * the username. Returns undefined when no stable id can be derived (e.g. an API key without a
 * profile), in which case the caller must reject the request.
 */
export const toStableUserId = async ({
  authUser,
  resolveApiKeyProfileUid,
}: {
  authUser: StableUserIdAuthUser;
  resolveApiKeyProfileUid?: () => Promise<string | undefined>;
}): Promise<string | undefined> => {
  const isApiKey = authUser.authentication_type === 'api_key';
  let profileUid = authUser.profile_uid;

  if (isApiKey && profileUid === undefined && resolveApiKeyProfileUid) {
    profileUid = await resolveApiKeyProfileUid();
  }

  if (profileUid) {
    return profileUid;
  }

  if (isApiKey) {
    return undefined;
  }

  const realmType = authUser.authentication_realm?.type;
  const realmName = authUser.authentication_realm?.name;
  const { username } = authUser;
  if (!realmType || !realmName || !username) {
    return undefined;
  }

  return `realm:${JSON.stringify([realmType, realmName, username])}`;
};

/** Looks up the API key creator's profile uid, since `getCurrentUser` often omits it for API keys. */
export const resolveApiKeyOwnerProfileUid = async ({
  request,
  esClient,
}: {
  request: KibanaRequest;
  esClient: ElasticsearchClient;
}): Promise<string | undefined> => {
  const id = extractApiKeyIdFromAuthzHeader(request.headers.authorization);
  if (!id) {
    return undefined;
  }

  try {
    const response = await esClient.security.getApiKey({ with_profile_uid: true, id });
    return response.api_keys?.[0]?.profile_uid;
  } catch (error) {
    if (
      error instanceof errors.ResponseError &&
      (error.statusCode === 403 || error.statusCode === 404)
    ) {
      return undefined;
    }
    throw error;
  }
};

/**
 * Resolves the brief owner for a request. `esClient` should be scoped to the request user (used
 * only for the API key profile lookup). Returns undefined when there is no stable id.
 */
export const getBriefOwner = async ({
  authUser,
  request,
  esClient,
}: {
  authUser: StableUserIdAuthUser | null | undefined;
  request: KibanaRequest;
  esClient: ElasticsearchClient;
}): Promise<BriefOwner | undefined> => {
  if (!authUser?.username) {
    return undefined;
  }

  const id = await toStableUserId({
    authUser,
    resolveApiKeyProfileUid: () => resolveApiKeyOwnerProfileUid({ request, esClient }),
  });
  if (!id) {
    return undefined;
  }

  return { id };
};
