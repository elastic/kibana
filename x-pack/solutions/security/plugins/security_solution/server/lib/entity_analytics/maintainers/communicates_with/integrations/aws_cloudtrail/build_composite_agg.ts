/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCompositeAggQueryBase } from '../shared_query_utils';
import type { CompositeAfterKey } from '../../types';
import { HUMAN_IAM_IDENTITY_TYPES } from './constants';

export const buildCompositeAggQuery = (afterKey?: CompositeAfterKey) =>
  buildCompositeAggQueryBase(
    [
      { terms: { 'aws.cloudtrail.user_identity.type': HUMAN_IAM_IDENTITY_TYPES } },
      { exists: { field: 'host.target.entity.id' } },
    ],
    afterKey
  );

export { buildBucketUserFilter } from '../shared_query_utils';
