/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompositeAfterKey } from '../../types';
import { buildCompositeAggQueryBase } from '../shared_query_utils';

export { buildBucketUserFilter } from '../shared_query_utils';

const EXCLUDED_USERNAMES = ['SYSTEM', 'LOCAL SERVICE', 'NETWORK SERVICE', 'ANONYMOUS LOGON'];

export const buildCompositeAggQuery = (afterKey?: CompositeAfterKey) =>
  buildCompositeAggQueryBase(
    [
      { terms: { 'event.action': ['logged-in', 'logged-in-explicit'] } },
      { terms: { 'event.code': ['4624', '4648'] } },
      { terms: { 'winlog.logon.type': ['Interactive', 'RemoteInteractive', 'CachedInteractive'] } },
      { bool: { must_not: [{ terms: { 'user.name': EXCLUDED_USERNAMES } }] } },
    ],
    afterKey
  );
