/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';

import type { EntityStoreRecord } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { UsersType } from '../../../../explore/users/store/model';
import { getCriteriaFromUsersType } from './get_criteria_from_users_type';

describe('get_criteria_from_user_type', () => {
  test('returns user name from criteria if the user type is details', () => {
    const criteria = getCriteriaFromUsersType({ type: UsersType.details, userName: 'admin' });
    expect(criteria).toEqual([{ fieldName: 'user.name', fieldValue: 'admin' }]);
  });

  test('returns empty array from criteria if the user type is page but rather an empty array', () => {
    const criteria = getCriteriaFromUsersType({ type: UsersType.page, userName: 'admin' });
    expect(criteria).toEqual([]);
  });

  test('returns empty array from criteria if the user name is undefined and user type is details', () => {
    const criteria = getCriteriaFromUsersType({ type: UsersType.details, userName: undefined });
    expect(criteria).toEqual([]);
  });

  test('without EUID API, identity fields alone still use legacy user.name criteria', () => {
    const criteria = getCriteriaFromUsersType({
      type: UsersType.details,
      userName: 'admin',
      identityFields: { 'user.id': 'uid-1', 'user.name': 'admin' },
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

    const criteria = getCriteriaFromUsersType({
      type: UsersType.details,
      userName: 'admin',
      identityFields: { 'user.id': 'uid-1', 'user.name': 'from-identity' },
      euid,
    });
    expect(criteria).toEqual([
      { fieldName: 'user.id', fieldValue: 'uid-1' },
      { fieldName: 'user.name', fieldValue: 'from-identity' },
    ]);
  });

  test('with EUID API, uses entityRecord as input document instead of building from identityFields', () => {
    const entityRecord = {
      'user.id': 'record-uid',
      'user.name': 'from-record',
    } as unknown as EntityStoreRecord;

    const euid = {
      dsl: {
        getEuidFilterBasedOnDocument: jest.fn().mockReturnValue(undefined),
      },
      getEntityIdentifiersFromDocument: jest.fn().mockReturnValue({
        'user.id': 'record-uid',
        'user.name': 'from-record',
      }),
    } as unknown as EntityStoreEuid;

    const criteria = getCriteriaFromUsersType({
      type: UsersType.details,
      userName: 'admin',
      identityFields: { 'user.name': 'admin' },
      entityRecord,
      euid,
    });

    expect(euid.dsl.getEuidFilterBasedOnDocument).toHaveBeenCalledWith('user', entityRecord);
    expect(criteria).toEqual([
      { fieldName: 'user.id', fieldValue: 'record-uid' },
      { fieldName: 'user.name', fieldValue: 'from-record' },
    ]);
  });
});
