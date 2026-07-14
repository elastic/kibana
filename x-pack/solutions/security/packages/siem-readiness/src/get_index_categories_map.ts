/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_CATEGORIES, CATEGORY_ORDER } from './constants';
import type { CategoriesResponse, MainCategories } from './types';

/**
 * Builds a multi-valued index → categories map from categoriesData.
 *
 * An index can appear under multiple main categories because `event.category` is
 * multi-valued in ECS. This is the canonical mapping shared by UI and agent —
 * never collapse to a single category with last-writer-wins.
 */
export const getIndexCategoriesMap = (
  categoriesData: CategoriesResponse | undefined
): Map<string, MainCategories[]> => {
  const map = new Map<string, MainCategories[]>();
  if (!categoriesData?.mainCategoriesMap) return map;

  categoriesData.mainCategoriesMap.forEach(({ category, indices }) => {
    if (!ALL_CATEGORIES.includes(category as MainCategories)) return;

    indices.forEach(({ indexName }) => {
      const existing = map.get(indexName) ?? [];
      if (!existing.includes(category as MainCategories)) {
        map.set(indexName, [...existing, category as MainCategories]);
      }
    });
  });

  return map;
};

/**
 * Picks a single deterministic primary category when a display surface still
 * needs one label (e.g. attachment grouping). Uses CATEGORY_ORDER priority —
 * never document-count order or map iteration order.
 */
export const pickPrimaryCategory = (
  categories: MainCategories[] | undefined
): MainCategories | undefined => {
  if (!categories?.length) return undefined;
  for (const ordered of CATEGORY_ORDER) {
    if (categories.includes(ordered as MainCategories)) {
      return ordered as MainCategories;
    }
  }
  return categories[0];
};
