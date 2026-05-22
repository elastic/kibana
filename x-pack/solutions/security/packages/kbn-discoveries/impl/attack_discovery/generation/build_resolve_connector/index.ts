/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

interface ActionsClientLike {
  get: (params: { id: string }) => Promise<unknown>;
}

interface ActionsPluginLike {
  getActionsClientWithRequest: (request: KibanaRequest) => Promise<ActionsClientLike>;
}

interface InferenceLike {
  getConnectorById: (id: string, request: KibanaRequest) => Promise<unknown>;
}

interface PluginsStartLike {
  actions: ActionsPluginLike;
  inference?: InferenceLike;
}

/**
 * Builds a `resolveConnector` callback for use in `validatePreExecution`.
 *
 * Resolution order:
 * 1. If the `inference` plugin is available in `pluginsStart`, use
 *    `inference.getConnectorById()` — this handles both stack connectors and
 *    EIS endpoint connectors (IDs starting with `.`, e.g.
 *    `.openai-gpt-5.2-chat_completion`).
 * 2. Otherwise, fall back to `actionsClient.get()` (stack connectors only).
 *
 * EIS endpoint connectors are NOT stored as Kibana saved objects, so
 * `actionsClient.get()` throws `Saved object [action/<id>] not found` for
 * them. Using the inference plugin avoids this false-positive failure.
 */
export const buildResolveConnector = ({
  connectorId,
  getStartServices,
  request,
}: {
  connectorId: string;
  getStartServices: () => Promise<{ coreStart: unknown; pluginsStart: unknown }>;
  request: KibanaRequest;
}): (() => Promise<unknown>) => {
  return async () => {
    const { pluginsStart } = await getStartServices();
    const plugins = pluginsStart as PluginsStartLike;

    if (plugins.inference != null) {
      return plugins.inference.getConnectorById(connectorId, request);
    }

    const actionsClient = await plugins.actions.getActionsClientWithRequest(request);
    return actionsClient.get({ id: connectorId });
  };
};
