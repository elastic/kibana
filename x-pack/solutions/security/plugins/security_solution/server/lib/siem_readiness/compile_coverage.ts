/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIEM_READINESS_CATEGORIES,
  ECS_CATEGORY_TO_MAIN,
  MAIN_CATEGORY_MAPPING,
  getRuleIntegrationCoverage,
  hasMitreTacticMapping,
} from '@kbn/siem-readiness-common';
import type {
  MitreThreatEntry,
  CompiledCategoryData,
  CompiledCoverageData,
} from '@kbn/siem-readiness-common';
import type { CategoriesData } from './fetch_categories';

export type { CompiledCategoryData, CompiledCoverageData };

/** Minimal rule shape needed for coverage compilation. */
export interface CoverageRuleInput {
  related_integrations?: Array<{ package: string; version?: string; integration?: string }>;
  threat?: MitreThreatEntry[];
}

export interface CompiledCoverageOptions {
  category?: string;
}

/**
 * Compiles category data, detection rules, and installed packages into the final coverage report.
 * Pure function — no I/O. Used by both the agent tool and the HTTP route handler.
 */
export const compileCoverageData = (
  categoriesData: CategoriesData,
  rules: CoverageRuleInput[],
  installedPackageNames: string[],
  options: CompiledCoverageOptions = {}
): CompiledCoverageData => {
  const { category } = options;
  const { mainCategoriesMap, rawIndexBuckets } = categoriesData;

  const categoryIndexMap = Object.fromEntries(
    mainCategoriesMap.map(({ category: cat, indices }) => [cat, indices])
  );
  const activeCategories = new Set(Object.keys(categoryIndexMap));

  const { coveredRules, uncoveredRules, missingIntegrations } = getRuleIntegrationCoverage(
    rules,
    installedPackageNames
  );

  const mitreMappedRulesCount = rules.filter((r) => hasMitreTacticMapping(r.threat)).length;

  const targetCategories = category ? [category] : [...SIEM_READINESS_CATEGORIES];

  const categories = targetCategories.map((cat): CompiledCategoryData => {
    const indices = categoryIndexMap[cat] ?? [];
    const totalDocs = indices.reduce((sum, i) => sum + i.docs, 0);

    const activeEcsCategories = Object.entries(ECS_CATEGORY_TO_MAIN)
      .filter(([, mainCat]) => mainCat === cat)
      .map(([ecsCategory]) => ecsCategory)
      .filter((ecsCategory) =>
        rawIndexBuckets.some((b) => b.by_category?.buckets.some((cb) => cb.key === ecsCategory))
      );

    return {
      category: cat,
      hasActiveData: activeCategories.has(cat),
      indexCount: indices.length,
      totalDocs,
      coveredRules: coveredRules.length,
      uncoveredRules: uncoveredRules.length,
      totalRulesWithIntegrations: coveredRules.length + uncoveredRules.length,
      mitreMappedRules: mitreMappedRulesCount,
      missingIntegrations: missingIntegrations.sort(),
      activeEcsCategories,
      expectedEcsCategories: MAIN_CATEGORY_MAPPING[cat as keyof typeof MAIN_CATEGORY_MAPPING] ?? [],
    };
  });

  return {
    summary: {
      activeCategories: categories.filter((c) => c.hasActiveData).map((c) => c.category),
      inactiveCategories: categories.filter((c) => !c.hasActiveData).map((c) => c.category),
      totalInstalledIntegrations: installedPackageNames.length,
    },
    categories,
  };
};
