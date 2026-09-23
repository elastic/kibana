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
import { writeElasticManifest } from './elastic_manifest';

/**
 * Tracks per-conversation workspace state (connector IDs) and writes the connector manifest
 * (and, when configured, the Elasticsearch telemetry manifest) to the sandbox whenever the
 * session is reset or the allowed connector list changes.
 *
 * Create one instance per plugin lifecycle and share it across all sandbox tools.
 */
export const createSandboxWorkspaceManager = ({
  getDeps,
  telemetryConnectorId,
  logger,
}: {
  getDeps: () => { actions?: ActionsPluginStart };
  /** When set, `/workspace/elastic.md` is (re-)seeded alongside the connector manifest. */
  telemetryConnectorId?: string;
  logger: Logger;
}) => {
  const lastConnectorIds = new Map<SandboxSession, string>();

  return {
    async ensureWorkspaceReady({
      session,
      callContext,
    }: {
      session: SandboxSession;
      callContext: SandboxCallContext;
    }): Promise<void> {
      const currentKey = JSON.stringify([...callContext.allowedConnectorIds].sort());
      const lastKey = lastConnectorIds.get(session);

      if (!session.isReset && lastKey === currentKey) return;

      const { actions } = getDeps();
      const getActionsClient = actions
        ? (req: KibanaRequest) => actions.getActionsClientWithRequest(req)
        : undefined;

      try {
        await writeConnectorManifest({ session, callContext, getActionsClient, logger });
        lastConnectorIds.set(session, currentKey);
      } catch (err) {
        logger.warn(`Connector manifest write failed: ${(err as Error).message}`);
      }

      if (telemetryConnectorId) {
        try {
          await writeElasticManifest({ session, connectorId: telemetryConnectorId, logger });
        } catch (err) {
          logger.warn(`Elastic manifest write failed: ${(err as Error).message}`);
        }
      }
    },
  };
};

export type SandboxWorkspaceManager = ReturnType<typeof createSandboxWorkspaceManager>;
