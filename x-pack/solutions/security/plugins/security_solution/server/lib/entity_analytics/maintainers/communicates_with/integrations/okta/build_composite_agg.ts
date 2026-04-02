/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCompositeAggQueryBase } from '../shared_query_utils';
import type { CompositeAfterKey } from '../../types';
import { OKTA_AUTH_EVENT_ACTIONS } from './constants';

export const buildCompositeAggQuery = (afterKey?: CompositeAfterKey) =>
  buildCompositeAggQueryBase(
    [
      { terms: { 'event.action': OKTA_AUTH_EVENT_ACTIONS } },
      { exists: { field: 'okta.target.display_name' } },
    ],
    afterKey
  );

export { buildBucketUserFilter } from '../shared_query_utils';
