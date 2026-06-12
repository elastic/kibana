/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ManyCategoriesWarningReason {
  type: 'manyCategories';
  categoriesDocumentRatio: number;
}
interface ManyDeadCategoriesWarningReason {
  type: 'manyDeadCategories';
  deadCategoriesRatio: number;
}
interface ManyRareCategoriesWarningReason {
  type: 'manyRareCategories';
  rareCategoriesRatio: number;
}
interface NoFrequentCategoriesWarningReason {
  type: 'noFrequentCategories';
}
interface SingleCategoryWarningReason {
  type: 'singleCategory';
}

export type CategoryQualityWarningReason =
  | ManyCategoriesWarningReason
  | ManyDeadCategoriesWarningReason
  | ManyRareCategoriesWarningReason
  | NoFrequentCategoriesWarningReason
  | SingleCategoryWarningReason;

export type CategoryQualityWarningReasonType = CategoryQualityWarningReason['type'];

export interface CategoryQualityWarning {
  type: 'categoryQualityWarning';
  jobId: string;
  dataset: string;
  reasons: CategoryQualityWarningReason[];
}

export type QualityWarning = CategoryQualityWarning;
