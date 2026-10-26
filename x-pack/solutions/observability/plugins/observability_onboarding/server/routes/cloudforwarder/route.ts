/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import * as t from 'io-ts';
import Boom from '@hapi/boom';
import type { estypes } from '@elastic/elasticsearch';
import { createManagedOtlpServiceApiKey } from '../../lib/api_key/create_managed_otlp_service_api_key';
import { hasLogMonitoringPrivileges } from '../../lib/api_key/has_log_monitoring_privileges';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getManagedOtlpServiceUrl } from '../../lib/get_managed_otlp_service_url';
import { CLOUDFORWARDER_INDEX_PATTERNS } from '../../../common/aws_cloudforwarder';
import {
  isNoShardsAvailableError,
  throwHasDataSearchError,
} from '../../lib/handle_has_data_search_error';
import { checkPreExistingData } from '../../lib/check_pre_existing_data';

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

const hasCloudForwarderDataRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/cloudforwarder/has-data',
  params: t.type({
    query: t.type({
      logType: t.keyof({ vpcflow: null, elbaccess: null, cloudtrail: null }),
      start: t.string,
    }),
  }),
  security: {
    authz: {
      enabled: false,
      reason: 'Authorization is checked by Elasticsearch',
    },
  },
  async handler(resources): Promise<{ hasData: boolean; hasPreExistingData?: boolean }> {
    const { logType, start } = resources.params.query;
    const { elasticsearch } = await resources.context.core;

    const indexPattern = CLOUDFORWARDER_INDEX_PATTERNS[logType];

    try {
      const [preExisting, result] = await Promise.all([
        checkPreExistingData(elasticsearch.client.asCurrentUser, [indexPattern], start),
        elasticsearch.client.asCurrentUser.search({
          index: [indexPattern],
          ignore_unavailable: true,
          allow_partial_search_results: true,
          size: 0,
          terminate_after: 1,
          query: {
            bool: {
              filter: [{ range: { '@timestamp': { gte: start } } }],
            },
          },
        }),
      ]);

      const hasData = (result.hits.total as estypes.SearchTotalHits).value > 0;
      return { hasData, hasPreExistingData: preExisting || undefined };
    } catch (error) {
      if (isNoShardsAvailableError(error)) {
        return { hasData: false };
      }

      throwHasDataSearchError(error);
    }
  },
});

export const cloudforwarderOnboardingRouteRepository = {
  ...createCloudForwarderOnboardingFlowRoute,
  ...hasCloudForwarderDataRoute,
};
