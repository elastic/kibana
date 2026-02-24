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
import type { OverviewEmbeddableState } from '../../../../server/lib/embeddables/schema';
import { transformSingleOverviewOut } from './transform_single_overview_out';
import { transformGroupOverviewOut } from './transform_group_overview_out';

export const getTransformOut = (transformDrilldownsOut: DrilldownTransforms['transformOut']) => {
  const transformOut = (storedState: OverviewEmbeddableState, panelReferences?: Reference[]) => {
    const transformsFlow = flow(
      transformSingleOverviewOut,
      transformGroupOverviewOut,
      transformTitlesOut<OverviewEmbeddableState>,
      (state: OverviewEmbeddableState) =>
        transformDrilldownsOut(
          state as OverviewEmbeddableState & {
            drilldowns?: Array<{ label: string; trigger: string; type: string }>;
          },
          panelReferences
        )
    );
    return transformsFlow(storedState);
  };
  return transformOut;
};
