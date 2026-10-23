/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SandboxConnector } from '../../common/sandbox_connectors';

/**
 * The connectors the investigation agent could use from its sandbox: every sandbox-capable
 * connector the caller can read. Which of them the agent actually uses is the agent's own
 * `connector_ids`, managed in Agent Builder.
 */
export type ListSandboxConnectors = (request: KibanaRequest) => Promise<SandboxConnector[]>;

export const createListSandboxConnectors =
  ({ getActions }: { getActions: () => ActionsPluginStart | undefined }): ListSandboxConnectors =>
  async (request) => {
    const actions = getActions();
    if (!actions) return [];
    const actionsClient = await actions.getActionsClientWithRequest(request);
    const all = await actionsClient.getAll({
      includeSystemActions: false,
      sandboxCapableOnly: true,
    });
    return all.map((connector) => ({
      id: connector.id,
      name: connector.name,
      connector_type_id: connector.actionTypeId,
      is_preconfigured: connector.isPreconfigured,
    }));
  };
