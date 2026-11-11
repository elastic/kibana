/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { capitalize } from 'lodash';
import { isEndpointPolicyValidForLicense } from '../../../common/license/policy_config';
import type { PolicyConfig } from '../../../common/endpoint/types';
import type { LicenseService } from '../../../common/license';

export const validatePolicyAgainstLicense = (
  policyConfig: PolicyConfig,
  licenseService: LicenseService,
  logger: Logger
): void => {
  const licenseInformation = licenseService.getLicenseInformation();
  if (!isEndpointPolicyValidForLicense(policyConfig, licenseInformation)) {
    logger.warn('Incorrect license tier for paid policy fields');
    // `statusCode` sets the HTTP code used in the API response. `apiPassThrough` is the marker
    // Fleet checks to rethrow this error instead of swallowing it and persisting the inbound
    // payload unchanged, so it must keep that exact name.
    const licenseError: Error & { statusCode?: number; apiPassThrough?: boolean } = new Error(
      `${capitalize(
        licenseInformation?.type || 'current'
      )} license does not support this action. Please upgrade your license.`
    );
    licenseError.statusCode = 403;
    licenseError.apiPassThrough = true;

    throw licenseError;
  }
};
