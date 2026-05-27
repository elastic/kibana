/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MainCategories, PipelineStats, VisibilityStatus } from '../types';
import { isCriticalFailureRate } from './status_check_helpers';

export const getContinuityStatus = (
  pipelinesData: PipelineStats[] | undefined,
  indexToCategoryMap: Map<string, string>,
  activeCategories: MainCategories[]
): VisibilityStatus => {
  if (!pipelinesData?.length) return 'noData';

  let hasCritical = false;
  let hasRelevantPipelines = false;

  pipelinesData.forEach((pipeline) => {
    const pipelineCategories = new Set<string>();
    pipeline.indices.forEach((indexName) => {
      const category = indexToCategoryMap.get(indexName);
      if (category) pipelineCategories.add(category);
    });

    const isInActiveCategory = Array.from(pipelineCategories).some((cat) =>
      activeCategories.includes(cat as MainCategories)
    );

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
