/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { OnSetup } from '@kbn/core-di';
import { CoreSetup } from '@kbn/core-di-server';
import { NIGHTSHIFT_DETECTION_TIERED_FEATURES } from '../../common/constants';

/** Setup-time registrations of the plugin. */
export function bindOnSetup({ bind }: ContainerModuleLoadOptions): void {
  bind(OnSetup).toResolvedValue(
    (pricing) => () => {
      pricing.registerProductFeatures(NIGHTSHIFT_DETECTION_TIERED_FEATURES);
    },
    [CoreSetup('pricing')]
  );
}
