/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { OverviewStatsEmbeddableState } from './types';

export function getTransformIn(transformDrilldownsIn: DrilldownTransforms['transformIn']) {
  function transformIn(state: OverviewStatsEmbeddableState): {
    state: OverviewStatsEmbeddableState;
    references: Reference[];
  } {
    return transformDrilldownsIn(state);
  }
  return transformIn;
}
