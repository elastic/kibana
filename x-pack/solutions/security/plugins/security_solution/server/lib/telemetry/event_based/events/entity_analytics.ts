/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EventTypeOpts } from '@kbn/core/server';

/**
 * Emitted once per cluster, when the alert `entity.id` backfill finishes and removes itself.
 */
export const ALERT_ENTITY_ID_BACKFILL_COMPLETED_EVENT: EventTypeOpts<{
  durationInSeconds: number;
  runs: number;
  spacesCompleted: number;
  spacesAbandoned: number;
  alertsStamped: number;
  reachedRunLimit: boolean;
}> = {
  eventType: 'alert_entity_id_backfill_completed',
  schema: {
    durationInSeconds: {
      type: 'long',
      _meta: {
        description: 'Seconds from the first run of the backfill task to the run that removed it.',
      },
    },
    runs: {
      type: 'long',
      _meta: { description: 'Task runs the backfill took to finish' },
    },
    spacesCompleted: {
      type: 'long',
      _meta: { description: 'Spaces whose alerts were fully backfilled' },
    },
    spacesAbandoned: {
      type: 'long',
      _meta: {
        description:
          'Spaces given up on after repeated failures. Their alerts keep using the risk scoring fallback.',
      },
    },
    alertsStamped: {
      type: 'long',
      _meta: { description: 'Alerts that had kibana.alert.entity.id written onto them' },
    },
    reachedRunLimit: {
      type: 'boolean',
      _meta: {
        description:
          'Whether the task removed itself because it hit its run limit rather than because every space finished',
      },
    },
  },
};

export const ENTITY_ANALYTICS_EVENTS = [ALERT_ENTITY_ID_BACKFILL_COMPLETED_EVENT];
