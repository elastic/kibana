/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden } from '@hapi/boom';
import { SLORoutesDependencies } from '../../types';

export const assertPlatinumLicense = async (plugins: SLORoutesDependencies['plugins']) => {
  const licensing = await plugins.licensing.start();
  const hasCorrectLicense = (await licensing.getLicense()).hasAtLeast('platinum');

  if (!hasCorrectLicense) {
    throw forbidden('Platinum license or higher is needed to make use of this feature.');
  }
};
