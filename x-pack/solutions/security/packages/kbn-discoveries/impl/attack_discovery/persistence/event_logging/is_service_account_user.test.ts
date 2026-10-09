/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';

import { isServiceAccountUser } from './is_service_account_user';

const getUser = ({
  realmType,
  username,
}: {
  realmType: string;
  username: string;
}): AuthenticatedUser => ({
  authentication_provider: { name: 'basic', type: 'basic' },
  authentication_realm: { name: realmType, type: realmType },
  authentication_type: 'token',
  elastic_cloud_user: false,
  enabled: true,
  http_authentication_scheme: 'Bearer',
  lookup_realm: { name: realmType, type: realmType },
  roles: [],
  username,
});

describe('isServiceAccountUser', () => {
  it('returns true for an Elasticsearch service account', () => {
    expect(
      isServiceAccountUser(
        getUser({ realmType: '_service_account', username: 'kibana/alertzero_attack_discovery' })
      )
    ).toBe(true);
  });

  it('returns true for a cloud (UIAM) service account', () => {
    expect(
      isServiceAccountUser(
        getUser({ realmType: '_cloud_service_account', username: 'alertzero_attack_discovery' })
      )
    ).toBe(true);
  });

  it('returns false for a native realm user', () => {
    expect(isServiceAccountUser(getUser({ realmType: 'native', username: 'test_user' }))).toBe(
      false
    );
  });

  it('returns false for a SAML user whose username looks like a service account', () => {
    expect(
      isServiceAccountUser(
        getUser({ realmType: 'saml', username: 'kibana/alertzero_attack_discovery' })
      )
    ).toBe(false);
  });

  it('returns false when the authentication realm is missing', () => {
    const { authentication_realm: _, ...userWithoutRealm } = getUser({
      realmType: '_service_account',
      username: 'kibana/alertzero_attack_discovery',
    });

    expect(isServiceAccountUser(userWithoutRealm as AuthenticatedUser)).toBe(false);
  });
});
