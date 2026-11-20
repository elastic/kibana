/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AuditedSandboxSession } from '../../sandbox_audit';
import type { SandboxCallContext } from './tool_utils';
import { writeConnectorManifest } from './connector_manifest';
import { CONNECTOR_DOCS, CONNECTOR_MANIFEST_PATH } from './connector_docs';
import type { ActionsClient } from './agent_connectors';
import { KIBANA_TOOLS_MANIFEST_PATH } from './kibana_callbacks';
import { KIBANA_SDK_PATH, renderKibanaSdk } from './kibana_sdk';
import { describeSandboxCallableTools } from './sandbox_callable_tools';
import type { SandboxToolRegistry } from './sandbox_callable_tools';
import { listCallableAgentConnectors, renderKibanaToolsManifest } from './kibana_tools_manifest';

const writeKibanaToolsManifest = async ({
  session,
  callContext,
  getActionsClient,
  getToolRegistry,
  logger,
}: {
  session: AuditedSandboxSession;
  callContext: SandboxCallContext;
  getActionsClient: ((req: KibanaRequest) => Promise<ActionsClient>) | undefined;
  getToolRegistry: ((req: KibanaRequest) => Promise<SandboxToolRegistry>) | undefined;
  logger: Logger;
}): Promise<void> => {
  let connectors: Awaited<ReturnType<typeof listCallableAgentConnectors>> = [];
  if (getActionsClient) {
    try {
      connectors = await listCallableAgentConnectors(
        await getActionsClient(callContext.request),
        callContext.allowedConnectorIds
      );
    } catch (err) {
      logger.warn(`Failed to list connectors for ${KIBANA_TOOLS_MANIFEST_PATH}: ${err}`);
    }
  }
  let tools: Awaited<ReturnType<typeof describeSandboxCallableTools>> = [];
  if (getToolRegistry) {
    try {
      tools = await describeSandboxCallableTools(await getToolRegistry(callContext.request));
    } catch (err) {
      logger.warn(`Failed to list callable tools for ${KIBANA_SDK_PATH}: ${err}`);
    }
  }
  const results = await session.writeFiles([
    {
      path: KIBANA_TOOLS_MANIFEST_PATH,
      content: Buffer.from(
        renderKibanaToolsManifest(
          connectors,
          tools.map(({ id }) => id)
        ),
        'utf8'
      ),
    },
    { path: KIBANA_SDK_PATH, content: Buffer.from(renderKibanaSdk(connectors, tools), 'utf8') },
  ]);
  if (results.length !== 2 || !results.every(({ success }) => success)) {
    throw new Error(`Failed to write ${KIBANA_TOOLS_MANIFEST_PATH} and ${KIBANA_SDK_PATH}`);
  }
};

/**
 * Tracks per-conversation workspace state (connector IDs) and writes the connector manifest and
 * the service guides to the sandbox whenever the session is reset or the allowed connector list
 * changes. Every connector, Elasticsearch included, comes from the agent's connector allow-list.
 *
 * Create one instance per plugin lifecycle and share it across all sandbox tools.
 */
export const createSandboxWorkspaceManager = ({
  getDeps,
  logger,
}: {
  getDeps: () => { actions?: ActionsPluginStart; agentBuilder?: AgentBuilderPluginStart };
  logger: Logger;
}) => {
  // Keyed by the pod session: the audited view of it is made per tool call.
  const lastWorkspaceKeys = new Map<object, string>();

  return {
    async ensureWorkspaceReady({
      session,
      callContext,
    }: {
      session: AuditedSandboxSession;
      callContext: SandboxCallContext;
    }): Promise<void> {
      const { actions, agentBuilder } = getDeps();
      const getToolRegistry = agentBuilder
        ? (request: KibanaRequest) => agentBuilder.tools.getRegistry({ request })
        : undefined;
      const getActionsClient = actions
        ? (req: KibanaRequest) => actions.getActionsClientWithRequest(req)
        : undefined;
      const currentKey = JSON.stringify({
        connectorIds: [...callContext.allowedConnectorIds].sort(),
      });
      const lastKey = lastWorkspaceKeys.get(session.sessionKey);
      if (!session.isReset && lastKey === currentKey) {
        // `isReset` is an edge-triggered signal and another sandbox RPC (for example the
        // before-agent allocation step) may consume it before tools run. Verify the actual
        // workspace invariant before trusting the connector cache.
        const manifestPaths = [
          CONNECTOR_MANIFEST_PATH,
          KIBANA_TOOLS_MANIFEST_PATH,
          KIBANA_SDK_PATH,
          ...CONNECTOR_DOCS.map(({ path }) => path),
        ];
        const manifests = await session.statFiles(manifestPaths);
        const workspaceReady =
          manifests.length === manifestPaths.length &&
          manifests.every(({ exists, is_dir: isDirectory }) => exists && !isDirectory);
        if (workspaceReady) {
          return;
        }
      }

      try {
        await writeConnectorManifest({
          session,
          callContext,
          getActionsClient,
          logger,
        });
        await writeKibanaToolsManifest({
          session,
          callContext,
          getActionsClient,
          getToolRegistry,
          logger,
        });
        lastWorkspaceKeys.set(session.sessionKey, currentKey);
      } catch (err) {
        lastWorkspaceKeys.delete(session.sessionKey);
        logger.warn(`Sandbox manifest write failed: ${(err as Error).message}`);
      }
    },
  };
};

export type SandboxWorkspaceManager = ReturnType<typeof createSandboxWorkspaceManager>;
