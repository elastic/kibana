/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils/src/types';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { OverviewStatsEmbeddableState } from './types';

export function getTransformOut(
  transformEnhancementsOut: EmbeddableSetup['transformEnhancementsOut']
) {
  function transformOut(state: OverviewStatsEmbeddableState, references?: Reference[]) {
    const { enhancements, ...rest } = state;
    const enhancementsState = enhancements
      ? transformEnhancementsOut(enhancements, references ?? [])
      : undefined;

    return {
      ...rest,
      ...(enhancementsState ? { enhancements: enhancementsState } : {}),
    };
  }
  return transformOut;
}
