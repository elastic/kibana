/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import Boom from '@hapi/boom';
import { createManagedOtlpServiceApiKey } from '../../lib/api_key/create_managed_otlp_service_api_key';
import { hasLogMonitoringPrivileges } from '../../lib/api_key/has_log_monitoring_privileges';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getManagedOtlpServiceUrl } from '../../lib/get_managed_otlp_service_url';

export interface CreateCloudForwarderOnboardingFlowRouteResponse {
  onboardingId: string;
  apiKeyEncoded: string;
  managedOtlpServiceUrl: string;
}

const createCloudForwarderOnboardingFlowRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/cloudforwarder/flow',
  security: {
    authz: {
      enabled: false,
      reason: 'This route has custom authorization logic using Elasticsearch client',
    },
  },
  async handler(resources): Promise<CreateCloudForwarderOnboardingFlowRouteResponse> {
    const { context, plugins } = resources;
    const {
      elasticsearch: { client },
    } = await context.core;

    /**
     * Check for log monitoring privileges (logs and metrics only, no traces).
     * CloudForwarder only forwards logs from AWS S3 (VPC Flow Logs, ELB Access Logs, CloudTrail).
     * This is consistent with other log-only flows (firehose, otel_host).
     */
    const hasPrivileges = await hasLogMonitoringPrivileges(client.asCurrentUser);

    if (!hasPrivileges) {
      throw Boom.forbidden(
        "You don't have enough privileges to start a new onboarding flow. Contact your system administrator to grant you the required privileges."
      );
    }

    const { encoded: apiKeyEncoded } = await createManagedOtlpServiceApiKey(
      client.asCurrentUser,
      'ingest-cloudforwarder'
    );

    return {
      onboardingId: uuidv4(),
      apiKeyEncoded,
      managedOtlpServiceUrl: getManagedOtlpServiceUrl(plugins),
    };
  },
});

export const cloudforwarderOnboardingRouteRepository = {
  ...createCloudForwarderOnboardingFlowRoute,
};
