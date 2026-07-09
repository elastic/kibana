/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

interface WorkflowsClientLike {
  emitEvent: (triggerId: string, payload: Record<string, unknown>) => Promise<void>;
}

export type EmitWorkflowTriggerEvent = (
  triggerId: string,
  payload: Record<string, unknown>
) => Promise<void>;

export function createWorkflowTriggerEmitter({
  getWorkflowsClient,
  logger,
  context,
}: {
  getWorkflowsClient: () => Promise<WorkflowsClientLike>;
  logger: Logger;
  context: string;
}): EmitWorkflowTriggerEvent {
  return async (triggerId, payload) => {
    try {
      const client = await getWorkflowsClient();
      await client.emitEvent(triggerId, payload);
    } catch (err) {
      logger.warn(
        `Failed to emit workflow trigger event "${triggerId}" for ${context}: ${
          (err as Error)?.message ?? 'unknown'
        }`
      );
    }
  };
}
