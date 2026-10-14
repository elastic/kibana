/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CategoriesResponse } from './types';

export const getIndexCategoryMap = (
  categoriesData: CategoriesResponse | undefined
): Map<string, string> => {
  const map = new Map<string, string>();
  if (!categoriesData?.mainCategoriesMap) return map;

  categoriesData.mainCategoriesMap.forEach(({ category, indices }) => {
    indices.forEach(({ indexName }) => map.set(indexName, category));
  });

  return map;
};
