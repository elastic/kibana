/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

import { AttackDiscoveryCreatedTriggerId } from '../../../common/workflow_triggers/attack_discovery_created';

/**
 * Content payload for a single `security.attackDiscoveryCreated` event.
 *
 * ⚠️ Id and non-sensitive metadata only — no AD narrative content (summary,
 * details, title). Trigger payloads land in `execution.context` and the
 * trigger-events log, a weaker authorization model than the AD alerts index, so
 * putting AD content here would be an information-disclosure finding (S6).
 */
export interface AttackDiscoveryCreatedEventPayload {
  /** The ids of the source alerts that contributed to this attack discovery. */
  alertIds: string[];
  /** The id of the attack discovery alert that was created. */
  attackDiscoveryAlertId: string;
  /** The generation run that produced this discovery. */
  generationUuid: string;
  /** Optional risk score associated with the attack discovery. */
  riskScore?: number;
  /** The space the attack discovery was created in. */
  spaceId: string;
}

/**
 * Emits a single `security.attackDiscoveryCreated` workflow trigger event.
 *
 * Best-effort by design: a Workflows failure must never fail Attack Discovery
 * persistence, so every error is swallowed and logged (mirrors the Cases event
 * bridge, `x-pack/platform/plugins/shared/cases/server/workflows/triggers/event_bridge.ts`).
 *
 * The emit uses the SAME request that performed the AD write so the workflow
 * engine attributes the event to the correct user and space and tracks
 * event-chain depth. Only the content fields are supplied; the engine injects
 * `timestamp`, `spaceId` and `eventChainDepth` before validating.
 */
export const emitAttackDiscoveryCreatedEvent = async ({
  logger,
  payload,
  request,
  workflowsExtensions,
}: {
  logger: Logger;
  payload: AttackDiscoveryCreatedEventPayload;
  request: KibanaRequest;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined;
}): Promise<void> => {
  if (workflowsExtensions == null) {
    return;
  }

  try {
    const client = await workflowsExtensions.getClient(request);

    await client.emitEvent(AttackDiscoveryCreatedTriggerId, {
      alertIds: payload.alertIds,
      attackDiscoveryAlertId: payload.attackDiscoveryAlertId,
      generationUuid: payload.generationUuid,
      spaceId: payload.spaceId,
      ...(payload.riskScore != null ? { riskScore: payload.riskScore } : {}),
    });
  } catch (error) {
    logger.warn(
      `Failed to emit "${AttackDiscoveryCreatedTriggerId}" workflow trigger: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
