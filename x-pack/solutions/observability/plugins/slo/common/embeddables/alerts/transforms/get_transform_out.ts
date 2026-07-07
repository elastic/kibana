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
import type { AlertsEmbeddableState } from '../../../../server/lib/embeddables/alerts_schema';
import { transformAlertsOut } from './transform_alerts_out';

export const getTransformOut = (transformDrilldownsOut: DrilldownTransforms['transformOut']) => {
  const transformOut = (storedState: AlertsEmbeddableState, panelReferences?: Reference[]) => {
    const transformsFlow = flow(
      transformAlertsOut,
      transformTitlesOut<AlertsEmbeddableState>,
      (state: AlertsEmbeddableState) =>
        transformDrilldownsOut(
          state as AlertsEmbeddableState & {
            drilldowns?: Array<{ label: string; trigger: string; type: string }>;
          },
          panelReferences
        )
    );
    return transformsFlow(storedState);
  };
  return transformOut;
};
