/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { Reference } from '@kbn/content-management-utils';
import type { OverviewStatsEmbeddableState } from './types';

export function getTransformIn(
  transformEnhancementsIn: EmbeddableSetup['transformEnhancementsIn']
) {
  function transformIn(state: OverviewStatsEmbeddableState): {
    state: OverviewStatsEmbeddableState;
    references: Reference[];
  } {
    const { enhancements, ...rest } = state;
    const enhancementsResult = enhancements
      ? transformEnhancementsIn(enhancements)
      : { state: undefined, references: [] };

    return {
      state: {
        ...rest,
        ...(enhancementsResult.state ? { enhancements: enhancementsResult.state } : {}),
      } as OverviewStatsEmbeddableState,
      references: enhancementsResult.references,
    };
  }
  return transformIn;
}
