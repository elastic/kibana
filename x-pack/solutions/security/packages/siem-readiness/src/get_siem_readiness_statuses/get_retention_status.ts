/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CategoriesResponse,
  MainCategories,
  RetentionResponse,
  VisibilityStatus,
} from '../types';
import { isRetentionNonCompliant } from './status_check_helpers';

export const getRetentionStatus = (
  categoriesData: CategoriesResponse | undefined,
  retentionData: RetentionResponse | undefined,
  activeCategories: MainCategories[]
): VisibilityStatus => {
  if (!categoriesData?.mainCategoriesMap || !retentionData?.items?.length) return 'noData';

  let hasNonCompliant = false;
  let hasRelevantData = false;

  categoriesData.mainCategoriesMap
    .filter((cat) => activeCategories.includes(cat.category as MainCategories))
    .forEach((category) => {
      category.indices.forEach((index) => {
        const matchingRetention = retentionData.items.find((retention) =>
          index.indexName.includes(retention.indexName)
        );
        if (matchingRetention) {
          hasRelevantData = true;
          if (isRetentionNonCompliant(matchingRetention.status)) {
            hasNonCompliant = true;
          }
        }
      });
    });

  if (!hasRelevantData) return 'noData';
  return hasNonCompliant ? 'actionsRequired' : 'healthy';
};
