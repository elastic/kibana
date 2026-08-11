/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type {
  AttackDiscoverySource,
  DiagnosticsContext,
  SourceMetadata,
} from '../../persistence/event_logging';
import {
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
  writeAttackDiscoveryEvent,
} from '../../persistence/event_logging';

export const writeGenerationStartedEvent = async ({
  authenticatedUser,
  connectorId,
  diagnosticsContext,
  eventLogger,
  eventLogIndex,
  executionUuid,
  loadingMessage,
  source,
  sourceMetadata,
  spaceId,
  workflowId,
}: {
  authenticatedUser: AuthenticatedUser;
  connectorId: string;
  diagnosticsContext?: DiagnosticsContext;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  loadingMessage: string;
  source?: AttackDiscoverySource;
  sourceMetadata?: SourceMetadata;
  spaceId: string;
  workflowId: string;
}): Promise<Date> => {
  const generationStartedAt = new Date();

  await writeAttackDiscoveryEvent({
    action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
    authenticatedUser,
    connectorId,
    dataClient: null,
    diagnosticsContext,
    eventLogger,
    eventLogIndex,
    executionUuid,
    loadingMessage,
    message: `Attack discovery generation ${executionUuid} started via generation workflow`,
    source,
    sourceMetadata,
    spaceId,
    start: generationStartedAt,
    workflowId,
  });

  return generationStartedAt;
};
