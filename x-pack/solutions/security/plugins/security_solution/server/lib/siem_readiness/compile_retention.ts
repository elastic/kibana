/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RetentionInfo,
  CompiledRetentionIndex,
  CompiledRetentionData,
} from '@kbn/siem-readiness-common';
import { SIEM_READINESS_CATEGORIES, RETENTION_THRESHOLD_DAYS } from '@kbn/siem-readiness-common';
import type { CategoriesData } from './fetch_categories';

export type { CompiledRetentionIndex, CompiledRetentionData };

export interface CompiledRetentionOptions {
  category?: string;
  statusFilter?: 'all' | 'non-compliant' | 'healthy';
}

/**
 * Compiles raw retention items and category data into the final retention report.
 * Pure function — no I/O. Used by both the agent tool and the HTTP route handler.
 */
export const compileRetentionData = (
  retentionItems: RetentionInfo[],
  categoriesData: CategoriesData,
  isServerless: boolean,
  options: CompiledRetentionOptions = {}
): CompiledRetentionData => {
  const { category, statusFilter = 'all' } = options;
  const { indexToCategoryMap } = categoriesData;

  const targetCategories = category ? [category] : [...SIEM_READINESS_CATEGORIES];

  const byCategory = targetCategories.map((cat) => {
    const itemsInCategory = retentionItems.filter(
      (item) =>
        indexToCategoryMap.get(item.indexName) === cat ||
        [...indexToCategoryMap.entries()].some(
          ([idx, c]) => c === cat && idx.includes(item.indexName)
        )
    );

    const filtered =
      statusFilter === 'all'
        ? itemsInCategory
        : itemsInCategory.filter((i) => i.status === statusFilter);

    return {
      category: cat,
      totalIndices: itemsInCategory.length,
      healthyCount: itemsInCategory.filter((i) => i.status === 'healthy').length,
      nonCompliantCount: itemsInCategory.filter((i) => i.status === 'non-compliant').length,
      indices: filtered.map(
        (item): CompiledRetentionIndex => ({
          indexName: item.indexName,
          isDataStream: item.isDataStream,
          managedBy:
            item.retentionType === 'ilm' ? 'ILM' : item.retentionType === 'dsl' ? 'DSL' : 'None',
          retentionPeriod: item.retentionPeriod ?? 'Not configured',
          retentionDays: item.retentionDays,
          policyName: item.policyName,
          status: item.status,
        })
      ),
    };
  });

  const totalNonCompliant = byCategory.reduce((sum, c) => sum + c.nonCompliantCount, 0);
  const totalIndices = byCategory.reduce((sum, c) => sum + c.totalIndices, 0);

  return {
    summary: {
      totalIndices,
      healthyCount: totalIndices - totalNonCompliant,
      nonCompliantCount: totalNonCompliant,
      complianceThreshold: `${RETENTION_THRESHOLD_DAYS} days`,
      serverlessMode: isServerless,
    },
    byCategory,
  };
};
