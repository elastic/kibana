/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompositeAfterKey } from '../../types';
import { buildCompositeAggQueryBase } from '../shared_query_utils';

export { buildBucketUserFilter } from '../shared_query_utils';

export const buildCompositeAggQuery = (afterKey?: CompositeAfterKey) =>
  buildCompositeAggQueryBase(
    [{ term: { 'event.module': 'aws' } }, { term: { 'event.action': 'StartSession' } }],
    afterKey
  );
