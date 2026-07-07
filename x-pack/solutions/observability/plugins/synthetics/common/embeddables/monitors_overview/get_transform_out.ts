/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils/src/types';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import { flow } from 'lodash';
import { transformFiltersOut } from '../bwc/transform_filters_out';
import type { OverviewMonitorsEmbeddableState } from '../../types';

export function getTransformOut() {
  function transformOut(
    storedState: OverviewMonitorsEmbeddableState,
    _panelReferences?: Reference[],
    _containerReferences?: Reference[]
  ): OverviewMonitorsEmbeddableState {
    const transformsFlow = flow(
      transformTitlesOut<OverviewMonitorsEmbeddableState>,
      transformFiltersOut<OverviewMonitorsEmbeddableState>
    );
    return transformsFlow(storedState);
  }
  return transformOut;
}
