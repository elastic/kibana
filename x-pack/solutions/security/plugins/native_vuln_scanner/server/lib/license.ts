/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ILicense } from '@kbn/licensing-types';

export const LICENSE_REQUIRED_MESSAGE = i18n.translate(
  'xpack.nativeVulnScanner.licenseRequiredMessage',
  { defaultMessage: 'Native vulnerability scanning requires an Enterprise licence' }
);

/** Enterprise and trial both satisfy `hasAtLeast('enterprise')`; an expired licence does not. */
export const isEnterprise = (license: ILicense): boolean =>
  license.isActive && license.hasAtLeast('enterprise');

export class LicenseRequiredError extends Error {
  constructor() {
    super(LICENSE_REQUIRED_MESSAGE);
    this.name = 'LicenseRequiredError';
  }
}
