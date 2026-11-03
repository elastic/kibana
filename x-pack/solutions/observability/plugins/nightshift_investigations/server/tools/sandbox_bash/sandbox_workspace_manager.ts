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
import type { SandboxCallContext } from './tool_utils';
import { authorizeConnector } from './connector_authorization';
import { writeConnectorManifest } from './connector_manifest';
import {
  CONNECTOR_DOCS_ROOT,
  CONNECTOR_MANIFEST_PATH,
  ELASTIC_MANIFEST_PATH,
} from './connector_docs';
import { renderElasticManifest, writeElasticManifest } from './elastic_manifest';

/**
 * Tracks per-conversation workspace state (connector IDs) and writes the connector manifest and
 * the Elasticsearch guide (naming the configured telemetry connector when the agent may use it)
 * to the sandbox whenever the session is reset or the allowed connector list changes.
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
  getDeps: () => { actions?: ActionsPluginStart };
  /** When set and usable by the agent, `/workspace/.connector-docs/elastic.md` names this connector. */
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
      // Agents without a bound target (the assistant, custom agents) can use several telemetry
      // connectors; infer guidance for an unambiguous source, else fall back to the legacy
      // `telemetry_connector_id`, the same default an investigation without a named target uses.
      // With several named targets and no legacy default, `elastic.md` names none and the agent
      // picks one from `connectors.md`.
      const inferredTarget =
        new Set(allowedTargets.map(({ connectorId }) => connectorId)).size === 1
          ? allowedTargets[0]
          : undefined;
      const defaultTarget =
        telemetryConnectorId && callContext.allowedConnectorIds.includes(telemetryConnectorId)
          ? { connectorId: telemetryConnectorId, readableIndices: telemetryReadableIndices }
          : undefined;
      return boundTarget ?? inferredTarget ?? defaultTarget;
    })();
    callTargets.set(callContext, pending);
    return pending;
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
      const { actions } = getDeps();
      const selected = await prepareCallContext(callContext);
      const selectedConnectorId = selected?.connectorId;
      const selectedReadableIndices = selected?.readableIndices;
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
        canUseTelemetry,
        selectedConnectorId,
        selectedReadableIndices,
      });
      const lastKey = lastWorkspaceKeys.get(session);
      if (!session.isReset && lastKey === currentKey) {
        // `isReset` is an edge-triggered signal and another sandbox RPC (for example the
        // before-agent allocation step) may consume it before tools run. Verify the actual
        // workspace invariant before trusting the connector cache.
        const manifests = await session.statFiles([ELASTIC_MANIFEST_PATH, CONNECTOR_MANIFEST_PATH]);
        const workspaceReady =
          manifests.length === 2 &&
          manifests.every(({ exists, is_dir: isDirectory }) => exists && !isDirectory);
        if (workspaceReady) {
          return;
        }
      }

      if (!canUseTelemetry) {
        lastWorkspaceKeys.delete(session);
        // The generic guide replaces previously seeded telemetry hints; a failed write must block
        // file access.
        await session.mkdirs([CONNECTOR_DOCS_ROOT]);
        const [result] = await session.writeFiles([
          {
            path: ELASTIC_MANIFEST_PATH,
            content: Buffer.from(renderElasticManifest()),
          },
        ]);
        if (!result?.success) throw new Error('Failed to clear sandbox telemetry guidance');
      }

      try {
        await writeConnectorManifest({
          session,
          callContext,
          getActionsClient,
          logger,
        });
        if (selectedConnectorId && canUseTelemetry) {
          await writeElasticManifest({
            session,
            credentials: { kind: 'connector', connectorId: selectedConnectorId },
            readableIndices: selectedReadableIndices,
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
