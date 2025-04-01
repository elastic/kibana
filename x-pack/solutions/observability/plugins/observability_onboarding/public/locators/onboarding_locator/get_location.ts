/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability/locators';
import { PLUGIN_ID } from '../../../common';

export function getLocation(params: ObservabilityOnboardingLocatorParams) {
  const { source, category } = params;

  const path = ['/'];

  if (source) {
    path.push(source);
  }

  if (category) {
    path.push(`?category=${category}`);
  }

  return {
    app: PLUGIN_ID,
    path: path.join(''),
    state: {},
  };
}
