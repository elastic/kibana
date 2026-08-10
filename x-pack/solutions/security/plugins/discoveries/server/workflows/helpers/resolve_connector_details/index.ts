/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

import type { NonEmptyString } from '../../../lib/non_empty_string';

interface ActionsClientLike {
  get: (params: { id: string }) => Promise<{ actionTypeId: string; name: string }>;
}

/**
 * Resolves `actionTypeId` and `connectorName` from `connector_id`.
 *
 * Resolution order:
 * 1. Both `actionTypeId` and `connectorName` already provided → return immediately (no I/O).
 * 2. `inference` + `request` provided → use `inference.getConnectorById()`, which handles
 *    both stack connectors and EIS endpoint IDs (e.g. `.anthropic-claude-4.6-opus-chat_completion`).
 * 3. No inference → use `actionsClient.get()` (stack connectors only, existing fallback).
 */
export const resolveConnectorDetails = async ({
  actionsClient,
  actionTypeId,
  connectorId,
  connectorName,
  inference,
  logger,
  request,
}: {
  actionsClient: ActionsClientLike;
  actionTypeId?: NonEmptyString;
  connectorId: string;
  connectorName?: NonEmptyString;
  inference?: InferenceServerStart;
  logger: Logger;
  request?: KibanaRequest;
}): Promise<{ actionTypeId: string; connectorName: string }> => {
  if (actionTypeId && connectorName) {
    return { actionTypeId, connectorName };
  }

  logger.debug(
    () =>
      `Resolving connector details for ${connectorId} (actionTypeId=${
        actionTypeId ?? 'missing'
      }, connectorName=${connectorName ?? 'missing'})`
  );

  if (inference != null && request != null) {
    try {
      const connector = await inference.getConnectorById(connectorId, request);

      return {
        actionTypeId: actionTypeId ?? connector.type,
        connectorName: connectorName ?? connector.name,
      };
    } catch (error) {
      throw new Error(
        `Failed to resolve connector details for ${connectorId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  try {
    const connector = await actionsClient.get({ id: connectorId });

    return {
      actionTypeId: actionTypeId ?? connector.actionTypeId,
      connectorName: connectorName ?? connector.name,
    };
  } catch (error) {
    throw new Error(
      `Failed to resolve connector details for ${connectorId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
