/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IEventLogger } from '@kbn/event-log-plugin/server';
import { AuthenticatedUser } from '@kbn/core/server';

import { ATTACK_DISCOVERY_EVENT_PROVIDER } from '../../../../../../common/constants';
import { AttackDiscoveryDataClient } from '../../../../../lib/attack_discovery/persistence';

const MAX_LENGTH = 1024;

export const writeAttackDiscoveryEvent = async ({
  action,
  alertsContextCount,
  attackDiscoveryAlertsEnabled,
  authenticatedUser,
  connectorId,
  dataClient,
  duration,
  end,
  eventLogger,
  eventLogIndex,
  executionUuid,
  loadingMessage,
  message,
  newAlerts,
  outcome,
  reason,
  spaceId,
  start,
}: {
  /** The generation action (event.action) i.e. generation-started, generation-succeeded, generation-failed */
  action:
    | 'generation-started'
    | 'generation-succeeded'
    | 'generation-failed'
    | 'generation-cancelled'
    | 'generation-dismissed';
  /** The number of alerts sent as context to the LLM for the generation */
  alertsContextCount?: number;
  /** This client is used to wait for an event log refresh */
  dataClient: AttackDiscoveryDataClient | null;
  /** Feature flag */
  attackDiscoveryAlertsEnabled: boolean;
  /** The authenticated user generating Attack discoveries */
  authenticatedUser: AuthenticatedUser;
  /** The connector id (event.dataset) for this generation */
  connectorId: string;
  /** The duration (event.duration) of a successful generation in nanoseconds */
  duration?: number;
  /** When generation ended (event.end) */
  end?: Date;
  /** Event log writer */
  eventLogger: IEventLogger;
  /** Event log index (to refresh) */
  eventLogIndex: string;
  /** The unique identifier (kibana.alert.rule.execution.uuid) for the generation */
  executionUuid: string;
  /** The loading message (kibana.alert.rule.execution.status) logged for the generation */
  loadingMessage?: string;
  /** The root-level message logged for the event */
  message: string;
  /** The number of new Attack discovery alerts generated */
  newAlerts?: number;
  /** The outcome (event.outcome) of the generation i.e.success or failure */
  outcome?: 'success' | 'failure';
  /** event.reason for failed generations */
  reason?: string;
  /** The Kibana space ID */
  spaceId: string;
  /** When generation started (event.start) */
  start?: Date;
}) => {
  if (attackDiscoveryAlertsEnabled) {
    const alertsCountActive =
      alertsContextCount != null
        ? {
            active: alertsContextCount,
          }
        : undefined;

    const alertsCountsNew =
      newAlerts != null
        ? {
            new: newAlerts,
          }
        : undefined;

    const metrics =
      alertsCountActive != null || alertsCountsNew != null
        ? {
            alert_counts: {
              ...alertsCountActive,
              ...alertsCountsNew,
            },
          }
        : undefined;

    const status = loadingMessage;

    // required because reason is mapped with "ignore_above": 1024, so it won't be returned in the search result if it exceeds this length:
    const trimmedReason =
      reason != null && reason.length > MAX_LENGTH ? reason.substring(0, MAX_LENGTH) : reason;

    const attackDiscoveryEvent = {
      '@timestamp': new Date().toISOString(),
      event: {
        action, // e.g. generation-started, generation-succeeded, generation-failed
        dataset: connectorId, // The connector id for this generation
        duration, // The duration of a successful generation in nanoseconds
        end: end?.toISOString(), // When generation ended
        outcome, // The outcome of the generation (success or failure)
        provider: ATTACK_DISCOVERY_EVENT_PROVIDER, // The plugin-registered provider name
        reason: trimmedReason, // for failed generations
        start: start?.toISOString(), // When generation started
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'siem',
            execution: {
              metrics,
              status,
              uuid: executionUuid, // The unique identifier for the generation
            },
          },
        },
        space_ids: [spaceId], // The Kibana space ID
      },
      message,
      tags: ['securitySolution', 'attackDiscovery'],
      user: {
        name: authenticatedUser.username, // only user.name is supported
      },
    };

    try {
      eventLogger.logEvent(attackDiscoveryEvent);
    } finally {
      await dataClient?.refreshEventLogIndex(eventLogIndex);
    }
  }
};
