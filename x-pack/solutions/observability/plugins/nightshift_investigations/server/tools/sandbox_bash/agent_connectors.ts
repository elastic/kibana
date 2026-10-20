/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SandboxCallContext } from './tool_utils';

export type ActionsClient = Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequest']>>;

export interface AgentConnector {
  id: string;
  name: string;
  actionTypeId: string;
}

/**
 * Returns the connectors assigned to this agent that the current user can access.
 * Returns [] when actions is not available or the allow-list is empty.
 */
export const listAgentConnectors = async (
  callContext: SandboxCallContext,
  getActionsClient: ((req: KibanaRequest) => Promise<ActionsClient>) | undefined
): Promise<AgentConnector[]> => {
  if (!getActionsClient || callContext.allowedConnectorIds.length === 0) return [];

  try {
    const actionsClient = await getActionsClient(callContext.request);
    const all = await actionsClient.getAll({ includeSystemActions: false });
    const allowedSet = new Set(callContext.allowedConnectorIds);
    return all
      .filter((c) => allowedSet.has(c.id))
      .map((c) => ({ id: c.id, name: c.name, actionTypeId: c.actionTypeId }));
  } catch (err) {
    return [];
  }
};
