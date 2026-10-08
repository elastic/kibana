/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import type { SandboxSecretsClient } from '../../sandbox_secrets';
import type { SandboxCallContext } from './tool_utils';
import { authorizeConnector } from './connector_authorization';
import { writeConnectorManifest } from './connector_manifest';
import { writeElasticManifest } from './elastic_manifest';

/**
 * Tracks per-conversation workspace state (connector IDs and sandbox secret keys) and writes the
 * connector manifest (and, when configured, the Elasticsearch telemetry manifest) to the sandbox
 * whenever the session is reset or the allowed connector list or available secret keys change.
 *
 * Create one instance per plugin lifecycle and share it across all sandbox tools.
 */
export const createSandboxWorkspaceManager = ({
  getDeps,
  resolveTelemetryConnector,
  logger,
}: {
  getDeps: () => {
    actions?: ActionsPluginStart;
    sandboxSecretsClient?: Pick<SandboxSecretsClient, 'listKeysForSandbox'>;
  };
  /**
   * Resolves the telemetry connector for the request's space (the connector connected during
   * onboarding, else the kibana.yml one). When it resolves one, `/workspace/elastic.md` is
   * (re-)seeded alongside the connector manifest.
   */
  resolveTelemetryConnector: (
    request: KibanaRequest
  ) => Promise<{ connectorId: string; readableIndices?: string } | undefined>;
  logger: Logger;
}) => {
  const lastWorkspaceKeys = new Map<SandboxSession, string>();

  const listSecretKeys = async (
    sandboxSecretsClient: Pick<SandboxSecretsClient, 'listKeysForSandbox'> | undefined,
    callContext: SandboxCallContext
  ): Promise<string[]> => {
    if (!sandboxSecretsClient) return [];
    try {
      return await sandboxSecretsClient.listKeysForSandbox(callContext.request);
    } catch (err) {
      logger.warn(`Listing sandbox secrets failed: ${(err as Error).message}`);
      return [];
    }
  };

  return {
    async ensureWorkspaceReady({
      session,
      callContext,
    }: {
      session: SandboxSession;
      callContext: SandboxCallContext;
    }): Promise<void> {
      const { actions, sandboxSecretsClient } = getDeps();
      const secretKeys = await listSecretKeys(sandboxSecretsClient, callContext);
      const getActionsClient = actions
        ? (req: KibanaRequest) => actions.getActionsClientWithRequest(req)
        : undefined;
      const telemetry = await resolveTelemetryConnector(callContext.request);
      const telemetryConnectorId = telemetry?.connectorId;
      const telemetryAuthorization = telemetryConnectorId
        ? await authorizeConnector(telemetryConnectorId, callContext, actions)
        : undefined;
      const authorizedTelemetryConnector =
        telemetryAuthorization && !('errorMessage' in telemetryAuthorization)
          ? telemetryAuthorization.connector
          : undefined;
      const canUseTelemetry = Boolean(authorizedTelemetryConnector);
      const telemetryKibanaUrl =
        typeof authorizedTelemetryConnector?.config.kibanaUrl === 'string'
          ? authorizedTelemetryConnector.config.kibanaUrl
          : undefined;
      const currentKey = JSON.stringify({
        connectorIds: [...callContext.allowedConnectorIds].sort(),
        secretKeys: [...secretKeys].sort(),
        canUseTelemetry,
        telemetryConnectorId,
        telemetryKibanaUrl,
      });
      const lastKey = lastWorkspaceKeys.get(session);
      if (!session.isReset && lastKey === currentKey) {
        // `isReset` is an edge-triggered signal and another sandbox RPC (for example the
        // before-agent allocation step) may consume it before tools run. Verify the actual
        // workspace invariant before trusting the connector cache.
        const manifests = await session.statFiles([
          '/workspace/elastic.md',
          '/workspace/connectors.md',
        ]);
        const workspaceReady =
          manifests.length === 2 &&
          manifests.every(({ exists, is_dir: isDirectory }) => exists && !isDirectory);
        if (workspaceReady) {
          return;
        }
      }

      if (!canUseTelemetry) {
        lastWorkspaceKeys.delete(session);
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
        await writeConnectorManifest({
          session,
          callContext,
          getActionsClient,
          secretKeys,
          logger,
        });
        if (telemetryConnectorId && canUseTelemetry) {
          await writeElasticManifest({
            session,
            connectorId: telemetryConnectorId,
            readableIndices: telemetry?.readableIndices,
            hasKibanaUrl: Boolean(telemetryKibanaUrl),
            logger,
          });
        }
        lastWorkspaceKeys.set(session, currentKey);
      } catch (err) {
        lastWorkspaceKeys.delete(session);
        logger.warn(`Sandbox manifest write failed: ${(err as Error).message}`);
      }
    },
  };
};

export type SandboxWorkspaceManager = ReturnType<typeof createSandboxWorkspaceManager>;
