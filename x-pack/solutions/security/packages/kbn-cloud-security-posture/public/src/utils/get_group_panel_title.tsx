/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { GenericBuckets, RawBucket } from '@kbn/grouping/src';

/**
 * Gets the group panel title in the format "name - id" when aggregationField is provided,
 * otherwise returns just the bucket key as string.
 * This utility is shared between vulnerability and misconfiguration findings.
 */
export const getGroupPanelTitle = <T extends Record<string, any>>(
  bucket: RawBucket<T>,
  aggregationField?: keyof T
) => {
  const aggregationFieldValue = aggregationField
    ? (bucket[aggregationField] as { buckets?: GenericBuckets[] })?.buckets?.[0]?.key
    : null;

  if (aggregationFieldValue) {
    return (
      <>
        <strong>{aggregationFieldValue}</strong> - {bucket.key_as_string}
      </>
    );
  }

  return <strong>{bucket.key_as_string}</strong>;
};