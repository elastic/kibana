/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ScopedRunner } from '@kbn/agent-builder-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { getConnectorSpec, isSelectedActionEnabled, isToolAction } from '@kbn/connector-specs';
import type { SelectedActions } from '@kbn/connector-specs';
import type { SandboxCallbackHandler, SandboxCallbackResult } from '@kbn/sandbox-plugin/server';
import { authorizeConnector } from './connector_authorization';
import type { SandboxCallContext } from './tool_utils';
import { listSandboxCallableToolIds } from './sandbox_callable_tools';
import type { SandboxToolRegistry } from './sandbox_callable_tools';

export const KIBANA_TOOLS_MANIFEST_PATH = '/workspace/kibana_tools.md';

const errorMessageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * Answers the calls a sandbox command makes back into Kibana. Tools run through the Agent Builder
 * runner of the current tool call, connectors through the actions client; both as the user of the
 * conversation, so Kibana and Elasticsearch privileges apply as if the agent made the call.
 */
export const createSandboxCallbackHandler = ({
  runner,
  callContext,
  actions,
  toolRegistry,
}: {
  runner: Pick<ScopedRunner, 'runTool'>;
  callContext: SandboxCallContext;
  actions: ActionsPluginStart | undefined;
  /** Decides which tools are callable; without it no tool is. */
  toolRegistry: SandboxToolRegistry | undefined;
}): SandboxCallbackHandler => {
  // A command makes many callbacks; the registry answers once per command.
  let callableToolIds: Promise<string[]> | undefined;
  const getCallableToolIds = (): Promise<string[]> => {
    callableToolIds ??= toolRegistry
      ? listSandboxCallableToolIds(toolRegistry)
      : Promise.resolve([]);
    return callableToolIds;
  };

  const callTool = async (
    toolId: string,
    params: Record<string, unknown>
  ): Promise<SandboxCallbackResult> => {
    try {
      if (!(await getCallableToolIds()).includes(toolId)) {
        return {
          ok: false,
          errorMessage: `Tool '${toolId}' cannot be called from the sandbox. Find callable tools with kibana.search_tools('<what you need>') in /workspace/kibana_sdk.py.`,
        };
      }
      const { results = [] } = await runner.runTool({
        toolId,
        toolParams: params,
        source: 'agent',
      });
      const errors = results.filter(({ type }) => type === ToolResultType.error);
      if (errors.length > 0) {
        return { ok: false, errorMessage: JSON.stringify(errors.map(({ data }) => data)) };
      }
      return { ok: true, result: { results } };
    } catch (err) {
      return { ok: false, errorMessage: `Tool '${toolId}' failed: ${errorMessageOf(err)}` };
    }
  };

  const callConnector = async (
    connectorId: string,
    subAction: string,
    subActionParams: Record<string, unknown>
  ): Promise<SandboxCallbackResult> => {
    if (!actions) {
      return { ok: false, errorMessage: 'Connectors are not available in this deployment' };
    }
    const authorized = await authorizeConnector(connectorId, callContext, actions);
    if ('errorMessage' in authorized) {
      return { ok: false, errorMessage: authorized.errorMessage };
    }
    const { connector } = authorized;
    const spec = getConnectorSpec(connector.actionTypeId);
    if (!spec || !isToolAction(spec, subAction)) {
      return {
        ok: false,
        errorMessage: `Sub-action '${subAction}' cannot be called on connector type '${connector.actionTypeId}'. See ${KIBANA_TOOLS_MANIFEST_PATH} for the sub-actions you can call.`,
      };
    }
    if (!isSelectedActionEnabled(subAction, connector.config?.selectedActions as SelectedActions)) {
      return {
        ok: false,
        errorMessage: `Sub-action '${subAction}' is not enabled on connector '${connectorId}'. See ${KIBANA_TOOLS_MANIFEST_PATH} for the sub-actions you can call.`,
      };
    }
    try {
      const actionsClient = await actions.getActionsClientWithRequest(callContext.request);
      const result = await actionsClient.execute({
        actionId: connectorId,
        params: { subAction, subActionParams },
      });
      if (result.status === 'error') {
        const message = [result.message, result.serviceMessage].filter(Boolean).join(': ');
        return { ok: false, errorMessage: message || 'The connector returned an error' };
      }
      return { ok: true, result: result.data ?? null };
    } catch (err) {
      return {
        ok: false,
        errorMessage: `Sub-action '${subAction}' on connector '${connectorId}' failed: ${errorMessageOf(
          err
        )}`,
      };
    }
  };

  return async ({ target, params }) =>
    target.type === 'tool'
      ? callTool(target.toolId, params)
      : callConnector(target.connectorId, target.subAction, params);
};
