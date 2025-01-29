/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstNonNullValue } from '../../../../../../../../common/endpoint/models/ecs_safety_helpers';
import type { RawBucket, FlattenedBucket } from '../../types';

export const flattenBucket = ({
  bucket,
  maxRiskSubAggregations,
}: {
  bucket: RawBucket;
  maxRiskSubAggregations: Record<string, number | undefined>;
}): FlattenedBucket[] =>
  bucket.stackByField1?.buckets?.map<FlattenedBucket>((x) => ({
    doc_count: bucket.doc_count,
    key: bucket.key_as_string ?? bucket.key, // prefer key_as_string when available, because it contains a formatted date
    maxRiskSubAggregation: bucket.maxRiskSubAggregation,
    stackByField1Key: x.key_as_string ?? firstNonNullValue(x.key),
    stackByField1DocCount: x.doc_count,
  })) ?? [];
