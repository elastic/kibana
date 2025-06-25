/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewLocation } from '../../components/settings/private_locations/add_location_flyout';
import { AgentPolicyInfo } from '../../../../../common/types';
import { INITIAL_REST_VERSION, SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { PrivateLocation, SyntheticsPrivateLocations } from '../../../../../common/runtime_types';
import { apiService } from '../../../../utils/api_service/api_service';

export const fetchAgentPolicies = async (): Promise<AgentPolicyInfo[]> => {
  return await apiService.get(SYNTHETICS_API_URLS.AGENT_POLICIES);
};

export const createSyntheticsPrivateLocation = async (
  newLocation: NewLocation
): Promise<PrivateLocation> => {
  return await apiService.post(SYNTHETICS_API_URLS.PRIVATE_LOCATIONS, newLocation, undefined, {
    version: INITIAL_REST_VERSION,
  });
};

export const getSyntheticsPrivateLocations = async (): Promise<SyntheticsPrivateLocations> => {
  return await apiService.get(SYNTHETICS_API_URLS.PRIVATE_LOCATIONS, {
    version: INITIAL_REST_VERSION,
  });
};

export const deleteSyntheticsPrivateLocation = async (
  locationId: string
): Promise<SyntheticsPrivateLocations> => {
  return await apiService.delete(SYNTHETICS_API_URLS.PRIVATE_LOCATIONS + `/${locationId}`, {
    version: INITIAL_REST_VERSION,
  });
};
