/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-plugin/public';

/* hasEnterpriseLicense return if the given license is an active `enterprise` or greater license
 */
export function hasEnterpriseLicense(license: ILicense | null | undefined): boolean {
  if (license === undefined || license === null) return false;
  if (!license.isAvailable) return false;
  if (!license.isActive) return false;
  return license.hasAtLeast('enterprise');
}

/* hasPlatinumLicense return if the given license is an active `platinum` or greater license
 */
export function hasPlatinumLicense(license: ILicense | null | undefined): boolean {
  if (license === undefined || license === null) return false;
  if (!license.isAvailable) return false;
  if (!license.isActive) return false;
  return license.hasAtLeast('platinum');
}

/* hasGoldLicense return if the given license is an active `gold` or greater license
 */
export function hasGoldLicense(license: ILicense | null | undefined): boolean {
  if (license === undefined || license === null) return false;
  if (!license.isAvailable) return false;
  if (!license.isActive) return false;
  return license.hasAtLeast('gold');
}

/* isTrialLicense returns if the given license is an active `trial` license
 */
export function isTrialLicense(license: ILicense | null | undefined): boolean {
  if (license === undefined || license === null) return false;
  if (!license.isAvailable) return false;
  if (!license.isActive) return false;
  return license?.type === 'trial';
}
