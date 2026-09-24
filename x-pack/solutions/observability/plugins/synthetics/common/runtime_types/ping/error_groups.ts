/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from '../schema_output';
import {
  ErrorGroupItemType,
  ErrorGroupHistogramBucketType,
  ErrorGroupPatternType,
  ErrorGroupType,
  ErrorGroupsResponseType,
} from '../zod/ping';

export {
  ErrorGroupItemType,
  ErrorGroupHistogramBucketType,
  ErrorGroupPatternType,
  ErrorGroupType,
  ErrorGroupsResponseType,
};

export type ErrorGroupItem = SchemaOutput<typeof ErrorGroupItemType>;
export type ErrorGroupHistogramBucket = SchemaOutput<typeof ErrorGroupHistogramBucketType>;
export type ErrorGroupPattern = SchemaOutput<typeof ErrorGroupPatternType>;
export type ErrorGroup = SchemaOutput<typeof ErrorGroupType>;
export type ErrorGroupsResponse = SchemaOutput<typeof ErrorGroupsResponseType>;
