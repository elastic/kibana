/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GlobalSearchProviderResult } from '../../../../../plugins/global_search/common/types';

export const createResult = (
  parts: Partial<GlobalSearchProviderResult>
): GlobalSearchProviderResult => ({
  id: 'test',
  title: 'test result',
  type: 'test_type',
  url: '/some-url',
  score: 100,
  ...parts,
});
