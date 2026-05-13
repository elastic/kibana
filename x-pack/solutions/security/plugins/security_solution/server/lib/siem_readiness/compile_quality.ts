/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompiledQualityIndex, CompiledQualityData } from '@kbn/siem-readiness-common';
import { SIEM_READINESS_CATEGORIES } from '@kbn/siem-readiness-common';
import type { CategoriesData } from './fetch_categories';
import type { QualityResultWithStatus } from './fetch_quality_results';

export type { CompiledQualityIndex, CompiledQualityData };

export interface CompiledQualityOptions {
  category?: string;
  statusFilter?: 'all' | 'incompatible' | 'healthy';
}

/**
 * Compiles quality check results and category data into the final quality report.
 * Pure function — no I/O. Used by both the agent tool and the HTTP route handler.
 */
export const compileQualityData = (
  resultsByIndex: Map<string, QualityResultWithStatus>,
  categoriesData: CategoriesData,
  options: CompiledQualityOptions = {}
): CompiledQualityData => {
  const { category, statusFilter = 'all' } = options;
  const { indexToCategoryMap } = categoriesData;

  const targetCategories = category ? [category] : [...SIEM_READINESS_CATEGORIES];

  const byCategory = targetCategories.map((cat) => {
    const indicesInCategory = [...indexToCategoryMap.entries()]
      .filter(([, c]) => c === cat)
      .map(([indexName]) => indexName);

    const checkedIndices = indicesInCategory
      .map((indexName): CompiledQualityIndex | null => {
        const result = resultsByIndex.get(indexName);
        if (!result) return null;
        return {
          indexName,
          status: result.status,
          incompatibleFieldCount: result.incompatibleFieldCount,
          sameFamilyFieldCount: result.sameFamilyFieldCount,
          ecsFieldCount: result.ecsFieldCount,
          customFieldCount: result.customFieldCount,
          totalFieldCount: result.totalFieldCount,
          docsCount: result.docsCount,
          lastChecked: result.checkedAt ? new Date(result.checkedAt).toISOString() : null,
          ecsVersion: result.ecsVersion ?? null,
          error: result.error ?? null,
        };
      })
      .filter((r): r is CompiledQualityIndex => r !== null);

    const uncheckedIndices = indicesInCategory.filter(
      (indexName) => !resultsByIndex.has(indexName)
    );

    const filteredIndices =
      statusFilter === 'all'
        ? checkedIndices
        : checkedIndices.filter((i) => i.status === statusFilter);

    return {
      category: cat,
      totalActiveIndices: indicesInCategory.length,
      checkedCount: checkedIndices.length,
      uncheckedCount: uncheckedIndices.length,
      healthyCount: checkedIndices.filter((i) => i.status === 'healthy').length,
      incompatibleCount: checkedIndices.filter((i) => i.status === 'incompatible').length,
      uncheckedIndices,
      indices: filteredIndices,
    };
  });

  const totalChecked = byCategory.reduce((sum, c) => sum + c.checkedCount, 0);
  const totalIncompatible = byCategory.reduce((sum, c) => sum + c.incompatibleCount, 0);
  const totalUnchecked = byCategory.reduce((sum, c) => sum + c.uncheckedCount, 0);

  return {
    summary: {
      totalChecked,
      totalIncompatible,
      totalHealthy: totalChecked - totalIncompatible,
      totalUnchecked,
      note:
        totalUnchecked > 0
          ? `${totalUnchecked} indices have not been checked yet. Open the SIEM Readiness Quality tab to trigger checks.`
          : undefined,
    },
    byCategory,
  };
};
