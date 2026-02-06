/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils/src/types';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { flow } from 'lodash';
import type { OverviewStatsEmbeddableState } from './types';

export function getTransformOut(transformDrilldownsOut: DrilldownTransforms['transformOut']) {
  function transformOut(storedState: OverviewStatsEmbeddableState, references?: Reference[]) {
    const transformsFlow = flow(
      transformTitlesOut<OverviewStatsEmbeddableState>,
      (state: OverviewStatsEmbeddableState) => transformDrilldownsOut(state, references)
    );
    return transformsFlow(storedState);
  }
  return transformOut;
}
