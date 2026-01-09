/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnhancementsRegistry } from '@kbn/embeddable-plugin/common/enhancements/registry';
import { transformTitlesIn } from '@kbn/presentation-publishing';
import type { Reference } from '@kbn/content-management-utils';
import type { OverviewStatsEmbeddableState, OverviewStatsStoredState } from './types';

export function getTransformIn(transformEnhancementsIn: EnhancementsRegistry['transformIn']) {
  function transformIn(state: OverviewStatsEmbeddableState): {
    state: OverviewStatsStoredState;
    references: Reference[];
  } {
    const stateWithStoredTitles = transformTitlesIn(state);
    const { enhancements, ...rest } = stateWithStoredTitles;
    const { enhancementsState, enhancementsReferences } = enhancements
      ? transformEnhancementsIn(enhancements)
      : { enhancementsState: undefined, enhancementsReferences: [] };

    return {
      state: {
        ...rest,
        ...(enhancementsState ? { enhancements: enhancementsState } : {}),
      } as OverviewStatsEmbeddableState,
      references: enhancementsReferences,
    };
  }
  return transformIn;
}
