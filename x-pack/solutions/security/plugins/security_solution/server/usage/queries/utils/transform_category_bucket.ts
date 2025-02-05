/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FailureMessage } from '../../detections/rules/types';
import type { Categories } from '../../types';

/**
 * Given a category from a categorization aggregation this will
 * return it transformed.
 * @param bucket The category bucket to transform
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/8.1/search-aggregations-bucket-categorize-text-aggregation.html
 * @returns the bucket transformed
 */
export const transformCategoryBucket = (bucket: Categories['buckets'][0]): FailureMessage => {
  return { message: bucket.key, count: bucket.doc_count };
};
