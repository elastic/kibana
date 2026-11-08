/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import type { SandboxCallContext } from './tool_utils';
import { writeConnectorManifest } from './connector_manifest';
import { CONNECTOR_DOCS, CONNECTOR_MANIFEST_PATH } from './connector_docs';

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
  getDeps: () => { actions?: ActionsPluginStart };
  logger: Logger;
}) => {
  const lastWorkspaceKeys = new Map<SandboxSession, string>();

  return {
    async ensureWorkspaceReady({
      session,
      callContext,
    }: {
      session: SandboxSession;
      callContext: SandboxCallContext;
    }): Promise<void> {
      const { actions } = getDeps();
      const getActionsClient = actions
        ? (req: KibanaRequest) => actions.getActionsClientWithRequest(req)
        : undefined;
      const currentKey = JSON.stringify({
        connectorIds: [...callContext.allowedConnectorIds].sort(),
      });
      const lastKey = lastWorkspaceKeys.get(session);
      if (!session.isReset && lastKey === currentKey) {
        // `isReset` is an edge-triggered signal and another sandbox RPC (for example the
        // before-agent allocation step) may consume it before tools run. Verify the actual
        // workspace invariant before trusting the connector cache.
        const manifestPaths = [CONNECTOR_MANIFEST_PATH, ...CONNECTOR_DOCS.map(({ path }) => path)];
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
        lastWorkspaceKeys.set(session, currentKey);
      } catch (err) {
        lastWorkspaceKeys.delete(session);
        logger.warn(`Sandbox manifest write failed: ${(err as Error).message}`);
      }
    },
  };
};

export type SandboxWorkspaceManager = ReturnType<typeof createSandboxWorkspaceManager>;
