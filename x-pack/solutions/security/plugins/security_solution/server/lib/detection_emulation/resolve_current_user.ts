/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';

/**
 * Resolves the username of the operator running an Agent Builder
 * detection-emulation tool call.
 *
 * Inside Agent Builder the request handed to a tool can be either:
 *
 * - a real HTTP request (synchronous chat path) — `security.authc.getCurrentUser`
 *   reads `http.auth.get(request).state`, which is populated by Kibana's HTTP
 *   auth middleware, and returns the authenticated user.
 * - a fake `KibanaRequest` constructed by the Agent Builder execution service
 *   when the agent runs on a Task Manager task. `getCurrentUser` returns
 *   `null` for fake requests because they were never processed by the auth
 *   middleware. The Task Manager task is running with the API key the user's
 *   chat session granted when the run was scheduled, so the API key owner is
 *   the operator we want to attribute the dispatch to. We resolve that owner
 *   via the `_security/_authenticate` API on the request-scoped ES client.
 *
 * Mirrors the canonical pattern from
 * `x-pack/platform/plugins/shared/agent_builder/server/services/utils.ts`
 * (`getUserFromRequest`); kept inline here because that helper is currently
 * internal to the agent_builder plugin and not exported from
 * `@kbn/agent-builder-server`. Follow-up: upstream the helper so callers no
 * longer need to inline this branch.
 */
export const resolveCurrentUsername = async ({
  request,
  security,
  esClient,
}: {
  request: KibanaRequest;
  security?: SecurityServiceStart;
  esClient: ElasticsearchClient;
}): Promise<string | undefined> => {
  if (!request.isFakeRequest) {
    const authUser = security?.authc.getCurrentUser(request);
    if (authUser?.username) {
      return authUser.username;
    }
  }

  try {
    const authResponse = await esClient.security.authenticate();
    return authResponse.username;
  } catch {
    return undefined;
  }
};
