/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { PrivateLocationRepository } from '../../../repositories/private_location_repository';

const DEFAULT_CHECKIN_MAX_BODY_BYTES = 1024 * 1024; // 1 MB — Fleet Server default

interface LocationDiagnostic {
  locationId: string;
  locationName: string;
  agentPolicyId: string;
  policySizeBytes: number;
  policySizeFormatted: string;
  inputCount: number;
  defaultMaxCheckinBytes: number;
  defaultMaxCheckinFormatted: string;
  exceedsDefault: boolean;
  utilizationPercent: number;
  error?: string;
}

interface AllPolicySizesResponse {
  locations: LocationDiagnostic[];
  totalLocations: number;
  locationsWithIssues: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const getAllPolicySizesRoute: SyntheticsRestApiRouteFactory<AllPolicySizesResponse> =
  () => ({
    method: 'GET',
    path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS_DIAGNOSTICS,
    validate: {},
    handler: async (routeContext) => {
      const { server } = routeContext;

      const repo = new PrivateLocationRepository(routeContext);
      const locations = await repo.getPrivateLocations();

      const soClient = server.coreStart.savedObjects.createInternalRepository();

      const diagnostics: LocationDiagnostic[] = await Promise.all(
        locations.map(async (location) => {
          try {
            const fullPolicy = await server.fleet.agentPolicyService.getFullAgentPolicy(
              soClient,
              location.agentPolicyId
            );

            if (!fullPolicy) {
              return {
                locationId: location.id,
                locationName: location.label,
                agentPolicyId: location.agentPolicyId,
                policySizeBytes: 0,
                policySizeFormatted: '0 B',
                inputCount: 0,
                defaultMaxCheckinBytes: DEFAULT_CHECKIN_MAX_BODY_BYTES,
                defaultMaxCheckinFormatted: formatBytes(DEFAULT_CHECKIN_MAX_BODY_BYTES),
                exceedsDefault: false,
                utilizationPercent: 0,
                error: `Agent policy ${location.agentPolicyId} not found or could not be compiled`,
              };
            }

            const policyJson = JSON.stringify(fullPolicy);
            const policySizeBytes = Buffer.byteLength(policyJson, 'utf8');
            const inputCount = fullPolicy.inputs?.length ?? 0;

            return {
              locationId: location.id,
              locationName: location.label,
              agentPolicyId: location.agentPolicyId,
              policySizeBytes,
              policySizeFormatted: formatBytes(policySizeBytes),
              inputCount,
              defaultMaxCheckinBytes: DEFAULT_CHECKIN_MAX_BODY_BYTES,
              defaultMaxCheckinFormatted: formatBytes(DEFAULT_CHECKIN_MAX_BODY_BYTES),
              exceedsDefault: policySizeBytes > DEFAULT_CHECKIN_MAX_BODY_BYTES,
              utilizationPercent: Math.round(
                (policySizeBytes / DEFAULT_CHECKIN_MAX_BODY_BYTES) * 100
              ),
            };
          } catch (e) {
            return {
              locationId: location.id,
              locationName: location.label,
              agentPolicyId: location.agentPolicyId,
              policySizeBytes: 0,
              policySizeFormatted: '0 B',
              inputCount: 0,
              defaultMaxCheckinBytes: DEFAULT_CHECKIN_MAX_BODY_BYTES,
              defaultMaxCheckinFormatted: formatBytes(DEFAULT_CHECKIN_MAX_BODY_BYTES),
              exceedsDefault: false,
              utilizationPercent: 0,
              error: e.message ?? 'Unknown error fetching policy',
            };
          }
        })
      );

      return {
        locations: diagnostics,
        totalLocations: diagnostics.length,
        locationsWithIssues: diagnostics.filter(
          (d) => d.exceedsDefault || d.utilizationPercent > 75 || d.error
        ).length,
      };
    },
  });
