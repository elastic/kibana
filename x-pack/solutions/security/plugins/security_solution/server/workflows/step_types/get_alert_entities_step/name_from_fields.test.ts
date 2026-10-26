/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nameFromFields } from './name_from_fields';

const HOST_ID = 'host:572750b8-c273-4934-aa08-79210b04c2fb';
const LOCAL_USER_ID = 'user:Administrator@572750b8-c273-4934-aa08-79210b04c2fb@local';

describe('nameFromFields', () => {
  it('names a host by its host.name', () => {
    expect(
      nameFromFields({
        entityId: HOST_ID,
        entityType: 'host',
        fields: { 'host.name': ['SRVWIN01'], 'user.name': ['ignored'] },
      })
    ).toBe('SRVWIN01');
  });

  it('names a service by its service.name', () => {
    expect(
      nameFromFields({
        entityId: 'service:checkout',
        entityType: 'service',
        fields: { 'host.name': ['SRVWIN01'], 'service.name': ['checkout'] },
      })
    ).toBe('checkout');
  });

  it('names a local user user.name@host.name', () => {
    expect(
      nameFromFields({
        entityId: LOCAL_USER_ID,
        entityType: 'user',
        fields: { 'host.name': ['SRVWIN01'], 'user.name': ['Administrator'] },
      })
    ).toBe('Administrator@SRVWIN01');
  });

  it('names a local user without a host name by its user.name', () => {
    expect(
      nameFromFields({
        entityId: LOCAL_USER_ID,
        entityType: 'user',
        fields: { 'user.name': ['Administrator'] },
      })
    ).toBe('Administrator');
  });

  it('names a user outside the local namespace by its user.name alone, even with a host name', () => {
    expect(
      nameFromFields({
        entityId: 'user:alice@okta',
        entityType: 'user',
        fields: { 'host.name': ['SRVWIN01'], 'user.name': ['alice'] },
      })
    ).toBe('alice');
  });

  it('leaves a user identified by email alone without a name', () => {
    expect(
      nameFromFields({
        entityId: 'user:alice@example.com@okta',
        entityType: 'user',
        fields: { 'host.name': ['SRVWIN01'] },
      })
    ).toBeUndefined();
  });

  it('takes the first value of a multi-valued field', () => {
    expect(
      nameFromFields({
        entityId: HOST_ID,
        entityType: 'host',
        fields: { 'host.name': ['first', 'second'] },
      })
    ).toBe('first');
  });

  it.each([[undefined], [{}], [{ 'host.name': [''] }]])('returns no name for %p', (fields) => {
    expect(nameFromFields({ entityId: HOST_ID, entityType: 'host', fields })).toBeUndefined();
  });

  // Names come from whoever controls the logs, and go into the agent's context.
  it('strips control and bidi characters from a name', () => {
    expect(
      nameFromFields({
        entityId: HOST_ID,
        entityType: 'host',
        fields: { 'host.name': ['SRV\nWIN01‮'] },
      })
    ).toBe('SRVWIN01');
  });

  it('strips each part of a local user name', () => {
    expect(
      nameFromFields({
        entityId: LOCAL_USER_ID,
        entityType: 'user',
        fields: { 'host.name': ['SRVWIN01\u0000'], 'user.name': ['⁦Administrator'] },
      })
    ).toBe('Administrator@SRVWIN01');
  });

  it('returns no name when nothing printable is left', () => {
    expect(
      nameFromFields({ entityId: HOST_ID, entityType: 'host', fields: { 'host.name': ['\n‮'] } })
    ).toBeUndefined();
  });

  it('names a local user by its user.name when nothing printable is left of the host name', () => {
    expect(
      nameFromFields({
        entityId: LOCAL_USER_ID,
        entityType: 'user',
        fields: { 'host.name': ['\u0000'], 'user.name': ['Administrator'] },
      })
    ).toBe('Administrator');
  });
});
