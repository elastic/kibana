/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MainCategories, PipelineStats, VisibilityStatus } from '../types';
import { isCriticalFailureRate } from './status_check_helpers';

/**
 * Computes the Continuity visibility status from server-computed pipeline.categories.
 *
 * Consumers must rely on `pipeline.categories` (the multi-valued union populated by
 * fetchPipelines) rather than recomputing category membership from a separate map —
 * that keeps status cards, the accordion, and the agent in agreement.
 */
export const getContinuityStatus = (
  pipelinesData: PipelineStats[] | undefined,
  activeCategories: MainCategories[]
): VisibilityStatus => {
  if (!pipelinesData?.length) return 'noData';

  let hasCritical = false;
  let hasRelevantPipelines = false;

  pipelinesData.forEach((pipeline) => {
    const pipelineCategories = pipeline.categories ?? [];
    const isInActiveCategory = pipelineCategories.some((cat) => activeCategories.includes(cat));

    if (isInActiveCategory) {
      hasRelevantPipelines = true;
      if (isCriticalFailureRate(pipeline.failedDocsCount, pipeline.docsCount)) {
        hasCritical = true;
      }
    }
  });

  if (!hasRelevantPipelines) return 'noData';
  return hasCritical ? 'actionsRequired' : 'healthy';
};
