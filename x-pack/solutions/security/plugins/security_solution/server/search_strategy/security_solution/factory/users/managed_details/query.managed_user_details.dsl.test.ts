/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagedUserDetailsRequestOptions } from '../../../../../../common/api/search_strategy';
import { UsersQueries } from '../../../../../../common/api/search_strategy';
import { buildManagedUserDetailsQuery } from './query.managed_user_details.dsl';

export const mockOptions: ManagedUserDetailsRequestOptions = {
  defaultIndex: ['logs-*'],
  userEmail: ['test-user-name@mail.com'],
  factoryQueryType: UsersQueries.managedDetails,
  userName: 'test-user-name',
};

describe('buildManagedUserDetailsQuery', () => {
  test('build query from options correctly', () => {
    expect(buildManagedUserDetailsQuery(mockOptions)).toMatchSnapshot();
  });
});
