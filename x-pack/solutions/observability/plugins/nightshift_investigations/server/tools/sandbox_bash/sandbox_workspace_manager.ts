/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import type { TelemetryTarget } from '../../telemetry_targets';
import type { SandboxSecretsClient } from '../../sandbox_secrets';
import type { SandboxCallContext } from './tool_utils';
import { authorizeConnector } from './connector_authorization';
import { writeConnectorManifest } from './connector_manifest';
import {
  findElasticSecretCredentials,
  writeElasticManifest,
  type ElasticCredentials,
} from './elastic_manifest';

/**
 * Tracks per-conversation workspace state (connector IDs and sandbox secret keys) and writes the
 * connector manifest (and, when configured, the Elasticsearch telemetry manifest) to the sandbox
 * whenever the session is reset or the allowed connector list or available secret keys change.
 *
 * Create one instance per plugin lifecycle and share it across all sandbox tools.
 */
export const createSandboxWorkspaceManager = ({
  getDeps,
  telemetryConnectorId,
  telemetryReadableIndices,
  telemetryTargets,
  getTelemetryTarget,
  logger,
}: {
  getDeps: () => {
    actions?: ActionsPluginStart;
    sandboxSecretsClient?: Pick<SandboxSecretsClient, 'listKeysForSandbox'>;
  };
  /**
   * When set, `/workspace/elastic.md` is (re-)seeded alongside the connector manifest. Without a
   * usable connector it documents the Elasticsearch sandbox secrets instead, when both exist.
   */
  telemetryConnectorId?: string;
  telemetryReadableIndices?: string;
  telemetryTargets?: TelemetryTarget[];
  getTelemetryTarget?: (callContext: SandboxCallContext) => Promise<TelemetryTarget | undefined>;
  logger: Logger;
}) => {
  const lastWorkspaceKeys = new Map<SandboxSession, string>();

  const configuredTargets = telemetryTargets ?? [
    { connectorId: telemetryConnectorId, readableIndices: telemetryReadableIndices },
  ];
  const telemetryConnectorIds = new Set(configuredTargets.map(({ connectorId }) => connectorId));
  const callTargets = new WeakMap<SandboxCallContext, Promise<TelemetryTarget | undefined>>();

  const prepareCallContext = (
    callContext: SandboxCallContext
  ): Promise<TelemetryTarget | undefined> => {
    const cached = callTargets.get(callContext);
    if (cached) return cached;
    const pending = (async () => {
      const boundTarget = await getTelemetryTarget?.(callContext);
      if (boundTarget !== undefined) {
        // Restrict both manifests and credential resolution to this conversation's telemetry.
        callContext.allowedConnectorIds = callContext.allowedConnectorIds.filter(
          (id) => !telemetryConnectorIds.has(id) || id === boundTarget.connectorId
        );
      }
      const allowedTargets = configuredTargets.filter(
        ({ connectorId }) => connectorId && callContext.allowedConnectorIds.includes(connectorId)
      );
      // Custom agents can use several connectors; only infer guidance for an unambiguous source.
      const inferredTarget =
        new Set(allowedTargets.map(({ connectorId }) => connectorId)).size === 1
          ? allowedTargets[0]
          : undefined;
      return boundTarget ?? inferredTarget;
    })();
    callTargets.set(callContext, pending);
    return pending;
  };

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
    async prepareCallContext(callContext: SandboxCallContext): Promise<void> {
      await prepareCallContext(callContext);
    },
    async ensureWorkspaceReady({
      session,
      callContext,
    }: {
      session: SandboxSession;
      callContext: SandboxCallContext;
    }): Promise<void> {
      const { actions, sandboxSecretsClient } = getDeps();
      const selected = await prepareCallContext(callContext);
      const selectedConnectorId = selected?.connectorId;
      const selectedReadableIndices = selected?.readableIndices;
      const secretKeys = await listSecretKeys(sandboxSecretsClient, callContext);
      const getActionsClient = actions
        ? (req: KibanaRequest) => actions.getActionsClientWithRequest(req)
        : undefined;
      const telemetryAuthorization = selectedConnectorId
        ? await authorizeConnector(selectedConnectorId, callContext, actions)
        : undefined;
      const canUseTelemetry = Boolean(
        telemetryAuthorization && !('errorMessage' in telemetryAuthorization)
      );
      const currentKey = JSON.stringify({
        connectorIds: [...callContext.allowedConnectorIds].sort(),
        secretKeys: [...secretKeys].sort(),
        canUseTelemetry,
        selectedConnectorId,
        selectedReadableIndices,
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
        const credentials: ElasticCredentials | undefined =
          selectedConnectorId && canUseTelemetry
            ? { kind: 'connector', connectorId: selectedConnectorId }
            : selected?.allowSecretFallback === false
            ? undefined
            : findElasticSecretCredentials(secretKeys);
        if (credentials) {
          await writeElasticManifest({
            session,
            credentials,
            // Connector-specific guidance must stay gated on connector authorization.
            readableIndices: credentials.kind === 'connector' ? selectedReadableIndices : undefined,
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
