/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRelatedUsersQuery } from './query.related_users.dsl';
import { mockOptions, expectedDsl } from './__mocks__';

describe('buildRelatedUsersQuery', () => {
  test('build query from options correctly', () => {
    expect(buildRelatedUsersQuery(mockOptions)).toMatchObject(expectedDsl);
  });
});
