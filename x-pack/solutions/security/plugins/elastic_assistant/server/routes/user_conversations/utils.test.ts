/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUserFilter } from './utils';

describe('getUserFilter', () => {
  it('returns onlyOwnerFilter when isOwner is true and id is provided', () => {
    const result = getUserFilter({ id: '123', isOwner: true });
    expect(result).toEqual('(created_by.id : "123") OR (NOT created_by:* AND users:{ id: "123" })');
  });

  it('returns onlyOwnerFilter when isOwner is true and name is provided', () => {
    const result = getUserFilter({ name: 'elastic', isOwner: true });
    expect(result).toEqual(
      '(created_by.name : "elastic") OR (NOT created_by:* AND users:{ name: "elastic" })'
    );
  });

  it('returns onlyOwnerFilter when isOwner is true and both name and id are provided', () => {
    const result = getUserFilter({ name: 'elastic', id: '123', isOwner: true });
    expect(result).toEqual(
      '(created_by.id : "123" OR created_by.name : "elastic") OR (NOT created_by:* AND users:{ name: "elastic" OR id: "123" })'
    );
  });

  it('returns onlyOwnerFilter when isOwner is true and both name and id are undefined', () => {
    const result = getUserFilter({ isOwner: true });
    expect(result).toEqual('(NOT users: { name: * } and NOT users: { id: * })');
  });

  it('returns userFilter + sharedFilter when isOwner is false and name is provided', () => {
    const result = getUserFilter({ name: 'elastic', isOwner: false });
    expect(result).toEqual(
      'users:{ name: "elastic" } OR (NOT users: { name: * } and NOT users: { id: * })'
    );
  });

  it('returns userFilter + sharedFilter when isOwner is false and both name and id are provided', () => {
    const result = getUserFilter({ name: 'elastic', id: '123', isOwner: false });
    expect(result).toEqual(
      'users:{ name: "elastic" OR id: "123" } OR (NOT users: { name: * } and NOT users: { id: * })'
    );
  });

  it('returns userFilter + sharedFilter when isOwner is false and id is provided', () => {
    const result = getUserFilter({ id: '123', isOwner: false });
    expect(result).toEqual(
      'users:{ id: "123" } OR (NOT users: { name: * } and NOT users: { id: * })'
    );
  });

  it('returns userFilter + sharedFilter when isOwner is false and both name and id are undefined', () => {
    const result = getUserFilter({ isOwner: false });
    expect(result).toEqual('(NOT users: { name: * } and NOT users: { id: * })');
  });
});
