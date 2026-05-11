/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';

export async function ensureLicense(licensing: LicensingPluginStart) {
  const license = await firstValueFrom(licensing.license$);
  const hasPlatinumLicense = license.hasAtLeast('platinum');
  if (!hasPlatinumLicense) {
    throw new Error('Invalid license');
  }
}
