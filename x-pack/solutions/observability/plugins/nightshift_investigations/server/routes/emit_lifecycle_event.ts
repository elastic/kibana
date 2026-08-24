/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  INVESTIGATION_COMPLETED_TRIGGER_ID,
  INVESTIGATION_FAILED_TRIGGER_ID,
} from '../../common/workflows/triggers';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const emitLifecycleEventRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/investigations/{id}/lifecycle_events',
  options: {
    access: 'internal',
    summary: 'Emit an investigation lifecycle trigger event',
    description:
      'Called by the final steps of the managed investigation workflow to emit the nightshift-investigations.completed / nightshift-investigations.failed workflow triggers.',
  },
  security: {
    // The workflow runs as the user who triggered the investigation, so the same agentBuilder:write
    // requirement as the start route applies (see start_investigation.ts for the reasoning).
    authz: {
      requiredPrivileges: ['agentBuilder:write'],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1).max(500),
    }),
    body: z.object({
      status: z.enum(['completed', 'failed']),
      started_at: z.string().min(1).max(64),
      subject: z.object({
        type: z.enum(['significant_event', 'alert']),
        // Empty for runs initiated without a subject (e.g. a bare manual run of the workflow).
        id: z.string().max(500),
      }),
    }),
  }),
  handler: async ({ request, params, getTriggerEmitter }) => {
    const emitter = getTriggerEmitter(request);
    if (!emitter) {
      return { emitted: false };
    }

    const completedAt = new Date().toISOString();
    const base = {
      investigation_id: params.path.id,
      subject: params.body.subject,
      started_at: params.body.started_at,
    };

    if (params.body.status === 'completed') {
      emitter(INVESTIGATION_COMPLETED_TRIGGER_ID, {
        ...base,
        status: 'completed',
        completed_at: completedAt,
      });
    } else {
      emitter(INVESTIGATION_FAILED_TRIGGER_ID, {
        ...base,
        status: 'failed',
        completed_at: completedAt,
      });
    }

    return { emitted: true };
  },
});
