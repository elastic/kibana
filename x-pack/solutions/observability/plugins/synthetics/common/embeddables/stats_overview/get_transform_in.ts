/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnhancementsRegistry } from '@kbn/embeddable-plugin/common/enhancements/registry';
import type { Reference } from '@kbn/content-management-utils';
import type { OverviewStatsEmbeddableState } from './types';

export function getTransformIn(transformEnhancementsIn: EnhancementsRegistry['transformIn']) {
  function transformIn(state: OverviewStatsEmbeddableState): {
    state: OverviewStatsEmbeddableState;
    references: Reference[];
  } {
    const { enhancements, ...rest } = state;
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
