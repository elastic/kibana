/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FailureMessage } from '../../detections/rules/types';
import type { Categories } from '../../types';
import { transformCategoryBucket } from './transform_category_bucket';

/**
 * Given a set of categories from a categorization aggregation this will
 * return those transformed.
 * @param categories The categories to transform
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/8.1/search-aggregations-bucket-categorize-text-aggregation.html
 * @returns the categories transformed
 */
export const transformCategories = (categories: Categories): FailureMessage[] => {
  return categories.buckets.map((bucket) => transformCategoryBucket(bucket));
};
