/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  NIGHTSHIFT_API_PRIVILEGES,
  NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES,
} from '@kbn/nightshift-shared';
import type {
  SignificantEventsMaintenanceStatus,
  SignificantEventsMaintenanceSummary,
} from '../../../../common/maintenance/types';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { bootstrapCleanupWorkflow } from '../../../lib/workflows/cleanup_workflow';

const bootstrapCleanupRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/maintenance/cleanup/_bootstrap',
  options: {
    access: 'internal',
    summary: 'Bootstrap stale Significant Events cleanup for the current space',
  },
  security: {
    authz: {
      requiredPrivileges: NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES,
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    server,
    getScopedClients,
    getSpaceId,
    cleanupWorkflowService,
    maintenanceService,
    logger,
  }): Promise<{ success: true }> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    await bootstrapCleanupWorkflow({
      cleanupWorkflowService,
      maintenanceService,
      request,
      spaceId: await getSpaceId(request),
      logger,
    });

    return { success: true };
  },
});

const pauseRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/maintenance/_pause',
  options: {
    access: 'internal',
    summary: 'Pause Significant Events activity',
    description:
      'Pauses Significant Events activity in the current space only: disables that space’s scheduled workflows, cancels their in-flight executions (including executions of the shared workflows running in that space), turns off its continuous onboarding and scheduled discovery settings, and disables the alerting rules backing knowledge indicator queries in that space. Other spaces are not affected. The shared workflows stay enabled because every space uses them. Existing data is kept. Idempotent while paused. ' +
      'The state is stored per space. Authorization uses the caller’s space-scoped Nightshift manage privilege, which is enough to pause that space. ' +
      'Stays available while the Nightshift feature flag is off, so background activity can be stopped without turning Nightshift back on.',
  },
  security: {
    authz: {
      requiredPrivileges: NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES,
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    server,
    getScopedClients,
    maintenanceService,
  }): Promise<SignificantEventsMaintenanceSummary> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, ignore: ['feature_flag'] });

    const updatedBy = server.core.security.authc.getCurrentUser(request)?.username;
    return maintenanceService.pause({ request, updatedBy });
  },
});

const resumeRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/maintenance/_resume',
  options: {
    access: 'internal',
    summary: 'Resume Significant Events activity',
    description:
      'Re-enables the workflows and alerting rules that Pause disabled in the current space, and restores the settings it turned off there. Other spaces are not affected. Does not restart cancelled executions. Idempotent while enabled.',
  },
  security: {
    authz: {
      requiredPrivileges: NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES,
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    server,
    getScopedClients,
    maintenanceService,
  }): Promise<SignificantEventsMaintenanceSummary> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    const updatedBy = server.core.security.authc.getCurrentUser(request)?.username;
    return maintenanceService.resume({ request, updatedBy });
  },
});

const resetRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/maintenance/_reset',
  options: {
    access: 'internal',
    summary: 'Reset Significant Events activity and data',
    description:
      'Cancels Significant Events activity and permanently deletes KIs, stored queries, backing rules, detections and space-tagged legacy discoveries in the current Kibana space only. The operation is best-effort, irreversible, and idempotent. Other spaces, source definitions and views, investigations, untagged legacy documents and `.rule-events` history are preserved. ' +
      'Requires Nightshift manage and configure privileges in the current space. The space is paused during cleanup and returned to enabled afterwards, with continuous onboarding and scheduled discovery off. Shared workflow documents remain enabled; only executions in the current space are cancelled. If the final state write fails after deletion, run reset again to return the space to enabled. ' +
      'Shared data streams are retained: documents are refreshed and deleted as the caller, requiring Elasticsearch `read`, `delete` and `maintenance` index privileges on the owned `.significant_events-*` streams. Missing privileges are reported in `partialFailures`. `deleted.dataStreams` counts streams from which current-space documents were removed, not physically deleted streams.',
  },
  security: {
    authz: {
      requiredPrivileges: NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES,
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    server,
    getScopedClients,
    maintenanceService,
  }): Promise<SignificantEventsMaintenanceSummary> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    const updatedBy = server.core.security.authc.getCurrentUser(request)?.username;
    return maintenanceService.reset({ request, updatedBy });
  },
});

const statusRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/maintenance/_status',
  options: {
    access: 'internal',
    summary: 'Get Significant Events maintenance status',
    description:
      'Returns the maintenance state of Significant Events activity in the current space (e.g. enabled or paused). Stays available while the Nightshift feature flag is off.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    server,
    getScopedClients,
    maintenanceService,
  }): Promise<SignificantEventsMaintenanceStatus> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, ignore: ['feature_flag'] });

    return maintenanceService.getStatus({ request });
  },
});

export const internalMaintenanceRoutes = {
  ...bootstrapCleanupRoute,
  ...pauseRoute,
  ...resumeRoute,
  ...resetRoute,
  ...statusRoute,
};
