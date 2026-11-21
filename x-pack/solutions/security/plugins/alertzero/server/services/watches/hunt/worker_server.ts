/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID } from '@kbn/alertzero-common';
import type { WorkerServerDefinition } from '../../../workers/types';
import { getPackageReportStepDefinition } from '../../../step_types/package_report';
import { makeScopedResolveHostEnrollment } from '../../fleet/resolve_host_enrollment';
import { createHuntServices } from './create_hunt_services';

export const continuousThreatHuntServerDefinition: WorkerServerDefinition = {
  workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  getStepDefinitions: (context) => {
    const huntServices = createHuntServices(context);
    return [
      getPackageReportStepDefinition({
        getActionsService: context.getActionsService,
        getConversations: context.getConversations,
        getHuntServices: () => huntServices,
        getResolveHostEnrollment: makeScopedResolveHostEnrollment(
          context.getFleetAgentService,
          context.logger
        ),
        isContextEngineEnabled: context.isContextEngineEnabled,
        getInternalEsClient: context.getInternalEsClient,
        logger: context.logger,
      }),
    ];
  },
};
