/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { flow } from 'lodash';
import type { BurnRateEmbeddableState } from '../../../../server/lib/embeddables/burn_rate_schema';
import { transformBurnRateOut } from './transform_burn_rate_out';

export const getTransformOut = (transformDrilldownsOut: DrilldownTransforms['transformOut']) => {
  const transformOut = (storedState: BurnRateEmbeddableState, panelReferences?: Reference[]) => {
    const transformsFlow = flow(
      transformBurnRateOut,
      transformTitlesOut<BurnRateEmbeddableState>,
      (state: BurnRateEmbeddableState) =>
        transformDrilldownsOut(
          state as BurnRateEmbeddableState & {
            drilldowns?: Array<{ label: string; trigger: string; type: string }>;
          },
          panelReferences
        )
    );
    return transformsFlow(storedState);
  };
  return transformOut;
};
