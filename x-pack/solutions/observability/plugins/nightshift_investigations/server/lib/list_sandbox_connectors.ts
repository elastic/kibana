/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SandboxConnector, SandboxConnectorType } from '../../common/sandbox_connectors';

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

/**
 * The connector types the investigation agent could use from its sandbox: the ones whose
 * connectors can hand their credentials to it, which the actions plugin decides.
 */
export type ListSandboxConnectorTypes = (request: KibanaRequest) => Promise<SandboxConnectorType[]>;

export const createListSandboxConnectorTypes =
  ({
    getActions,
  }: {
    getActions: () => ActionsPluginStart | undefined;
  }): ListSandboxConnectorTypes =>
  async (request) => {
    const actions = getActions();
    if (!actions) return [];
    const actionsClient = await actions.getActionsClientWithRequest(request);
    return actionsClient.listTypes({ includeSystemActionTypes: false, sandboxCapableOnly: true });
  };
