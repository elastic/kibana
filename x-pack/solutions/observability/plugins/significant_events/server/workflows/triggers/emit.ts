/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type {
  SignificantEventsTriggerId,
  SignificantEventsTriggerPayloadMap,
} from '../../../common/workflows/triggers';

/**
 * Fire-and-forget emitter for significant-events workflow triggers. Emission must never block or
 * break the underlying event write, so failures are logged and swallowed (same contract as the
 * Cases event bridge). Passing the attribution `request` keeps the workflows event-chain depth /
 * loop guardrails working.
 *
 * Generic over `SignificantEventsTriggerPayloadMap` so each trigger id only accepts its own payload
 * shape at the call site.
 */
export type TriggerEmitter = <T extends SignificantEventsTriggerId>(
  triggerId: T,
  payload: SignificantEventsTriggerPayloadMap[T]
) => void;

export const createTriggerEmitter = ({
  workflowsExtensions,
  request,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined;
  request: KibanaRequest;
  logger: Logger;
}): TriggerEmitter | undefined => {
  if (!workflowsExtensions) {
    return undefined;
  }

  // Resolve the request-scoped workflows client once per emitter and reuse it across emits (a
  // single bulk write can emit many triggers).
  let clientPromise: ReturnType<WorkflowsExtensionsServerPluginStart['getClient']> | undefined;

  const logFailure = (triggerId: SignificantEventsTriggerId, error: unknown): void => {
    logger.warn(
      `Failed to emit significant-events workflow trigger "${triggerId}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  };

  // Reset the cached promise only when client creation fails, so a later emit can retry it. A failed
  // `emitEvent` leaves a healthy client in place.
  const resolveClient = async (triggerId: SignificantEventsTriggerId) => {
    try {
      clientPromise ??= workflowsExtensions.getClient(request);
      return await clientPromise;
    } catch (error) {
      clientPromise = undefined;
      logFailure(triggerId, error);
      return undefined;
    }
  };

  return (triggerId, payload) => {
    void (async () => {
      const client = await resolveClient(triggerId);
      if (!client) {
        return;
      }

      try {
        await client.emitEvent(triggerId, payload);
      } catch (error) {
        logFailure(triggerId, error);
      }
    })();
  };
};
