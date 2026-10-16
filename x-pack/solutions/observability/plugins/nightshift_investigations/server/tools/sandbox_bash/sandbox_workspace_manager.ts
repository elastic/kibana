/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import type { SandboxSecretsClient } from '../../sandbox_secrets';
import type { SandboxCallContext } from './tool_utils';
import type { ConnectorCredentialDeps } from './connector_credentials';
import { writeConnectorManifest } from './connector_manifest';
import { writeElasticManifest } from './elastic_manifest';
import {
  REQUEST_SCOPED_CONNECTOR,
  REQUEST_SCOPED_CONNECTOR_ID,
  checkRequestScopedConnector,
} from './request_scoped_connector';

/**
 * Tracks per-conversation workspace state (connector IDs and sandbox secret keys) and writes the
 * connector manifest (and, when the request-scoped Elasticsearch connector is usable, the
 * Elasticsearch telemetry manifest) to the sandbox whenever the session is reset or the allowed
 * connector list or available secret keys change.
 *
 * Create one instance per plugin lifecycle and share it across all sandbox tools.
 */
export const createSandboxWorkspaceManager = ({
  getDeps,
  telemetryReadableIndices,
  logger,
}: {
  getDeps: () => ConnectorCredentialDeps & {
    sandboxSecretsClient?: Pick<SandboxSecretsClient, 'listKeysForSandbox'>;
  };
  telemetryReadableIndices?: string;
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
      const { actions, elasticsearchUrl, getSandboxServiceAccountId, sandboxSecretsClient } =
        getDeps();
      const secretKeys = await listSecretKeys(sandboxSecretsClient, callContext);
      const getActionsClient = actions
        ? (req: KibanaRequest) => actions.getActionsClientWithRequest(req)
        : undefined;
      const telemetryCheck = await checkRequestScopedConnector(
        callContext,
        elasticsearchUrl,
        getSandboxServiceAccountId
      );
      const canUseTelemetry = !('errorMessage' in telemetryCheck);
      if (
        !canUseTelemetry &&
        callContext.allowedConnectorIds.includes(REQUEST_SCOPED_CONNECTOR_ID)
      ) {
        logger.debug(`Elasticsearch connector unavailable: ${telemetryCheck.errorMessage}`);
      }
      const currentKey = JSON.stringify({
        connectorIds: [...callContext.allowedConnectorIds].sort(),
        secretKeys: [...secretKeys].sort(),
        canUseTelemetry,
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
          virtualConnectors: canUseTelemetry ? [REQUEST_SCOPED_CONNECTOR] : [],
          logger,
        });
        if (canUseTelemetry) {
          await writeElasticManifest({
            session,
            connectorId: REQUEST_SCOPED_CONNECTOR_ID,
            readableIndices: telemetryReadableIndices,
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
