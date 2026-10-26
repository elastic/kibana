/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entry } from '../exception_item_card/conditions/types';

export const includedListTypeEntry: Entry = {
  field: '',
  operator: 'included',
  type: 'list',
  list: { id: 'list_id', type: 'boolean' },
};

export const includedMatchTypeEntry: Entry = {
  field: '',
  operator: 'included',
  type: 'match',
  value: 'matches value',
};

export const includedExistsTypeEntry: Entry = {
  field: '',
  operator: 'included',
  type: 'exists',
};
