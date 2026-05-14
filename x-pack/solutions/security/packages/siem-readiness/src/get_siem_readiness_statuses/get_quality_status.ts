/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CategoriesResponse,
  DataQualityResultDocument,
  MainCategories,
  VisibilityStatus,
} from '../types';
import { isQualityIncompatible } from './is_quality_incompatible';

export const getQualityStatus = (
  categoriesData: CategoriesResponse | undefined,
  qualityData: DataQualityResultDocument[] | undefined,
  activeCategories: MainCategories[]
): VisibilityStatus => {
  if (!categoriesData?.mainCategoriesMap || !qualityData) return 'noData';

  const qualityMap = new Map(qualityData.map((result) => [result.indexName, result]));

  let hasIncompatible = false;
  let hasData = false;

  categoriesData.mainCategoriesMap
    .filter((cat) => activeCategories.includes(cat.category as MainCategories))
    .forEach((category) => {
      category.indices.forEach((index) => {
        hasData = true;
        const result = qualityMap.get(index.indexName);
        if (result && isQualityIncompatible(result.incompatibleFieldCount)) {
          hasIncompatible = true;
        }
      });
    });

  if (!hasData) return 'noData';
  return hasIncompatible ? 'actionsRequired' : 'healthy';
};
