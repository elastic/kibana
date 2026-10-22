/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';

export const createIsNightshiftEnabled = (getStartServices: CoreSetup['getStartServices']) => {
  let isEnabled = false;
  void getStartServices().then(([{ featureFlags }]) => {
    featureFlags.getBooleanValue$(NIGHTSHIFT_ENABLED_FLAG, false).subscribe((value) => {
      isEnabled = value;
    });
  });
  return async (): Promise<boolean> => isEnabled;
};
