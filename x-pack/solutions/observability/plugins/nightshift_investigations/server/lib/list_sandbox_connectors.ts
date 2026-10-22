/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SandboxConnector } from '../../common/sandbox_connectors';

/**
 * The connectors the investigation agent may use from its sandbox: every sandbox-capable
 * connector the caller can read, each with its Nightshift switch state.
 */
export type ListSandboxConnectors = (request: KibanaRequest) => Promise<SandboxConnector[]>;

export const createListSandboxConnectors =
  ({
    getActions,
    getDisabledConnectorIds,
    logger,
  }: {
    getActions: () => ActionsPluginStart | undefined;
    getDisabledConnectorIds: (request: KibanaRequest) => Promise<string[]>;
    logger: Logger;
  }): ListSandboxConnectors =>
  async (request) => {
    const actions = getActions();
    if (!actions) return [];
    try {
      const actionsClient = await actions.getActionsClientWithRequest(request);
      const [all, disabledIds] = await Promise.all([
        actionsClient.getAll({ includeSystemActions: false, sandboxCapableOnly: true }),
        getDisabledConnectorIds(request),
      ]);
      const disabled = new Set(disabledIds);
      return all.map((connector) => ({
        id: connector.id,
        name: connector.name,
        connector_type_id: connector.actionTypeId,
        is_preconfigured: connector.isPreconfigured,
        enabled: !disabled.has(connector.id),
      }));
    } catch (error) {
      logger.warn(`Failed to list sandbox connectors: ${(error as Error).message}`);
      return [];
    }
  };
