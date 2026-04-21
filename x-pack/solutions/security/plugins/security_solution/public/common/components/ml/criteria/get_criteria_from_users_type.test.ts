/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';

import { UsersType } from '../../../../explore/users/store/model';
import { getCriteriaFromUsersType } from './get_criteria_from_users_type';

describe('get_criteria_from_user_type', () => {
  test('returns user name from criteria if the user type is details', () => {
    const criteria = getCriteriaFromUsersType(UsersType.details, 'admin');
    expect(criteria).toEqual([{ fieldName: 'user.name', fieldValue: 'admin' }]);
  });

  test('returns empty array from criteria if the user type is page but rather an empty array', () => {
    const criteria = getCriteriaFromUsersType(UsersType.page, 'admin');
    expect(criteria).toEqual([]);
  });

  test('returns empty array from criteria if the user name is undefined and user type is details', () => {
    const criteria = getCriteriaFromUsersType(UsersType.details, undefined);
    expect(criteria).toEqual([]);
  });

  test('without EUID API, identity fields alone still use legacy user.name criteria', () => {
    const criteria = getCriteriaFromUsersType(UsersType.details, 'admin', {
      'user.id': 'uid-1',
      'user.name': 'admin',
    });
    expect(criteria).toEqual([{ fieldName: 'user.name', fieldValue: 'admin' }]);
  });

  test('with EUID API, defers to getEntityIdentifiersFromDocument when scoped DSL is unavailable', () => {
    const euid = {
      dsl: {
        getEuidFilterBasedOnDocument: jest.fn().mockReturnValue(undefined),
      },
      getEntityIdentifiersFromDocument: jest.fn().mockReturnValue({
        'user.id': 'uid-1',
        'user.name': 'from-identity',
      }),
    } as unknown as EntityStoreEuid;

    const criteria = getCriteriaFromUsersType(
      UsersType.details,
      'admin',
      {
        'user.id': 'uid-1',
        'user.name': 'from-identity',
      },
      euid
    );
    expect(criteria).toEqual([
      { fieldName: 'user.id', fieldValue: 'uid-1' },
      { fieldName: 'user.name', fieldValue: 'from-identity' },
    ]);
  });
});
