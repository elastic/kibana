/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import type { FeatureFlagsRequestHandlerContext } from '@kbn/core-feature-flags-server';
import { isCompositeSloEnabled } from '../../utils/is_composite_slo_enabled';

export async function assertCompositeSloEnabled(core: {
  featureFlags: FeatureFlagsRequestHandlerContext;
}): Promise<void> {
  if (!(await isCompositeSloEnabled(core.featureFlags))) {
    throw notFound();
  }
}
