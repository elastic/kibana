/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import type { PolicyBaselineEnvironment } from '../domain/normalized_endpoint_policy';
import { PolicyBaselineUnavailableError } from './policy_errors';

export const resolveDefaultPolicyEnvironment = (
  endpointAppContextService: EndpointAppContextService
): PolicyBaselineEnvironment => {
  const licenseService = endpointAppContextService.getLicenseService();
  const licenseInformation = licenseService.getLicenseInformation();
  const licenseType = licenseService.getLicenseType();

  if (!licenseInformation || licenseInformation.isAvailable !== true || licenseType.length === 0) {
    throw new PolicyBaselineUnavailableError();
  }

  return {
    license: licenseType,
    cloud: endpointAppContextService.getCloudSetup().isCloudEnabled,
    telemetryOptedIn:
      endpointAppContextService.getTelemetryConfigProvider().getIsOptedIn() ?? 'unresolved',
  };
};
