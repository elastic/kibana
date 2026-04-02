/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { PrivateLocationRepository } from '../../../repositories/private_location_repository';

const DEFAULT_CHECKIN_MAX_BODY_BYTES = 1024 * 1024; // 1 MB — Fleet Server default

interface PolicySizeResponse {
  locationId: string;
  agentPolicyId: string;
  policySizeBytes: number;
  policySizeFormatted: string;
  inputCount: number;
  defaultMaxCheckinBytes: number;
  defaultMaxCheckinFormatted: string;
  exceedsDefault: boolean;
  utilizationPercent: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const getPolicySizeRoute: SyntheticsRestApiRouteFactory<PolicySizeResponse> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS_POLICY_SIZE,
  validate: {
    params: schema.object({
      locationId: schema.string(),
    }),
  },
  handler: async (routeContext) => {
    const { server, request, response } = routeContext;
    const { locationId } = request.params as { locationId: string };

    const repo = new PrivateLocationRepository(routeContext);
    const locations = await repo.getPrivateLocations();
    const location = locations.find((loc) => loc.id === locationId);

    if (!location) {
      return response.notFound({
        body: { message: `Private location with id ${locationId} not found` },
      });
    }

    const { agentPolicyId } = location;
    const soClient = server.coreStart.savedObjects.createInternalRepository();

    const fullPolicy = await server.fleet.agentPolicyService.getFullAgentPolicy(
      soClient,
      agentPolicyId
    );

    if (!fullPolicy) {
      return response.notFound({
        body: { message: `Agent policy ${agentPolicyId} not found or could not be compiled` },
      });
    }

    const policyJson = JSON.stringify(fullPolicy);
    const policySizeBytes = Buffer.byteLength(policyJson, 'utf8');
    const inputCount = fullPolicy.inputs?.length ?? 0;

    return {
      locationId,
      agentPolicyId,
      policySizeBytes,
      policySizeFormatted: formatBytes(policySizeBytes),
      inputCount,
      defaultMaxCheckinBytes: DEFAULT_CHECKIN_MAX_BODY_BYTES,
      defaultMaxCheckinFormatted: formatBytes(DEFAULT_CHECKIN_MAX_BODY_BYTES),
      exceedsDefault: policySizeBytes > DEFAULT_CHECKIN_MAX_BODY_BYTES,
      utilizationPercent: Math.round((policySizeBytes / DEFAULT_CHECKIN_MAX_BODY_BYTES) * 100),
    };
  },
});
