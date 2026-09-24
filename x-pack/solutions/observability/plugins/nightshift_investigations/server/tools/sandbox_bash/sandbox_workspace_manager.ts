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
import { authorizeConnector } from './connector_authorization';
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
  telemetryReadableIndices,
  logger,
}: {
  getDeps: () => { actions?: ActionsPluginStart };
  /** When set, `/workspace/elastic.md` is (re-)seeded alongside the connector manifest. */
  telemetryConnectorId?: string;
  telemetryReadableIndices?: string;
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
      const { actions } = getDeps();
      const getActionsClient = actions
        ? (req: KibanaRequest) => actions.getActionsClientWithRequest(req)
        : undefined;
      const telemetryAuthorization = telemetryConnectorId
        ? await authorizeConnector(telemetryConnectorId, callContext, actions)
        : undefined;
      const canUseTelemetry = Boolean(
        telemetryAuthorization && !('errorMessage' in telemetryAuthorization)
      );
      const currentKey = JSON.stringify({
        connectorIds: [...callContext.allowedConnectorIds].sort(),
        canUseTelemetry,
      });
      const lastKey = lastConnectorIds.get(session);
      if (!session.isReset && lastKey === currentKey) return;

      if (telemetryConnectorId && !canUseTelemetry) {
        lastConnectorIds.delete(session);
        // Clear previously seeded hints on revocation; a failed clear must block file access.
        const [result] = await session.writeFiles([
          {
            path: '/workspace/elastic.md',
            content: Buffer.from('No telemetry connector is available.\n'),
          },
        ]);
        if (!result?.success) throw new Error('Failed to clear sandbox telemetry guidance');
      }

      try {
        await writeConnectorManifest({ session, callContext, getActionsClient, logger });
        if (telemetryConnectorId && canUseTelemetry) {
          await writeElasticManifest({
            session,
            connectorId: telemetryConnectorId,
            readableIndices: telemetryReadableIndices,
            logger,
          });
        }
        lastConnectorIds.set(session, currentKey);
      } catch (err) {
        lastConnectorIds.delete(session);
        logger.warn(`Sandbox manifest write failed: ${(err as Error).message}`);
      }
    },
  };
};

export type SandboxWorkspaceManager = ReturnType<typeof createSandboxWorkspaceManager>;
