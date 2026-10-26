/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { SLOPublicPluginsStart } from '..';

export async function isValidLicense(pluginsStart: SLOPublicPluginsStart) {
  const { serverless, cloud } = pluginsStart;
  if (serverless && cloud?.serverless.projectType !== 'observability') {
    return false;
  }

  const license = await firstValueFrom(pluginsStart.licensing.license$);
  return license.hasAtLeast('platinum');
}
