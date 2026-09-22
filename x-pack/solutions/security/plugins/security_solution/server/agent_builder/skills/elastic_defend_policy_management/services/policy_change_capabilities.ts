/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import type { PolicyChangeCapabilities } from '../domain/impact';

export const toPolicyChangeCapabilities = (
  endpointAppContextService: EndpointAppContextService
): PolicyChangeCapabilities => {
  const licenseService = endpointAppContextService.getLicenseService();
  const productFeatures = endpointAppContextService.getProductFeaturesService();
  const { experimentalFeatures } = endpointAppContextService;

  return {
    licenseInformation: licenseService.getLicenseInformation(),
    endpointPolicyProtections: productFeatures.isEnabled(
      ProductFeatureSecurityKey.endpointPolicyProtections
    ),
    endpointTrustedDevices: productFeatures.isEnabled(
      ProductFeatureSecurityKey.endpointTrustedDevices
    ),
    trustedDevicesExperimental: experimentalFeatures.trustedDevices,
    endpointProtectionUpdates: productFeatures.isEnabled(
      ProductFeatureSecurityKey.endpointProtectionUpdates
    ),
    endpointCustomNotification: productFeatures.isEnabled(
      ProductFeatureSecurityKey.endpointCustomNotification
    ),
    serverless: endpointAppContextService.isServerless(),
  };
};
