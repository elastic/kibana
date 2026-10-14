/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  EMITTED_INVESTIGATION_STATUSES,
  INVESTIGATION_COMPLETED_TRIGGER_ID,
  INVESTIGATION_FAILED_TRIGGER_ID,
  INVESTIGATION_STARTED_TRIGGER_ID,
} from '../../common/workflows/triggers';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';
import { rethrowInvestigationClientError } from './rethrow_investigation_client_error';

export const emitLifecycleEventRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/investigations/{id}/lifecycle_events',
  options: {
    access: 'internal',
    summary: 'Emit an investigation lifecycle trigger event',
    description:
      'Called by the managed investigation workflow to emit investigation lifecycle triggers.',
  },
  security: {
    authz: {
      requiredPrivileges: ['agentBuilder:write'],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    }),
    body: z.object({
      status: z.enum(EMITTED_INVESTIGATION_STATUSES),
    }),
  }),
  handler: async ({ request, params, getInvestigationsClient, getTriggerEmitter }) => {
    const emitter = getTriggerEmitter(request);
    if (!emitter) {
      return { accepted: false };
    }

    // Identity comes from the investigation's recorded subjects, never from the request body, so
    // a caller cannot emit lifecycle events attributed to a subject it made up.
    const lifecycleSubject = await getInvestigationsClient(request)
      .getLifecycleSubject(params.path.id)
      .catch(rethrowInvestigationClientError);

    if (!lifecycleSubject) {
      // An investigation without a subject (a bare workflow run) has nothing to attribute the
      // event to, so no lifecycle event is emitted.
      return { accepted: false };
    }
    const base = {
      investigation_id: params.path.id,
      subject: lifecycleSubject.subject,
      trigger_type: lifecycleSubject.triggerType,
      started_at: lifecycleSubject.startedAt,
    };

    switch (params.body.status) {
      case 'running':
        emitter(INVESTIGATION_STARTED_TRIGGER_ID, { ...base, status: 'running' });
        break;
      case 'completed':
        emitter(INVESTIGATION_COMPLETED_TRIGGER_ID, {
          ...base,
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
        break;
      case 'failed':
        emitter(INVESTIGATION_FAILED_TRIGGER_ID, {
          ...base,
          status: 'failed',
          completed_at: new Date().toISOString(),
        });
        break;
      default: {
        // TypeScript errors here when a status is added to EMITTED_INVESTIGATION_STATUSES
        // without a matching case above.
        const exhaustiveCheck: never = params.body.status;
        throw new Error(`Unsupported investigation lifecycle status: ${exhaustiveCheck}`);
      }
    }

    // Emission is fire-and-forget (the workflow step uses on-failure: continue), so this
    // acknowledges enqueue rather than delivery.
    return { accepted: true };
  },
});
