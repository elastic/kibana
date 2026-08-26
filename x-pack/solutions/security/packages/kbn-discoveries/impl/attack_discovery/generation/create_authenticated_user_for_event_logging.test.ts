/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAuthenticatedUserForEventLogging } from './create_authenticated_user_for_event_logging';

describe('createAuthenticatedUserForEventLogging', () => {
  const defaultAuthenticationInfo = {
    authentication_realm: { name: 'reserved', type: 'reserved' },
    lookup_realm: { name: 'reserved', type: 'reserved' },
    username: 'elastic',
  };

  describe('when called', () => {
    let result: ReturnType<typeof createAuthenticatedUserForEventLogging>;

    beforeEach(() => {
      result = createAuthenticatedUserForEventLogging({
        authenticationInfo: defaultAuthenticationInfo,
      });
    });

    it('sets authentication_provider.name', () => {
      expect(result.authentication_provider?.name).toBe('basic');
    });

    it('sets authentication_provider.type', () => {
      expect(result.authentication_provider?.type).toBe('basic');
    });

    it('sets elastic_cloud_user to false', () => {
      expect(result.elastic_cloud_user).toBe(false);
    });

    it('preserves username', () => {
      expect(result.username).toBe('elastic');
    });

    it('preserves authentication_realm', () => {
      expect(result.authentication_realm).toEqual({ name: 'reserved', type: 'reserved' });
    });

    it('preserves lookup_realm', () => {
      expect(result.lookup_realm).toEqual({ name: 'reserved', type: 'reserved' });
    });
  });

  describe('when extra fields exist in authenticationInfo', () => {
    it('preserves email', () => {
      const result = createAuthenticatedUserForEventLogging({
        authenticationInfo: {
          authentication_realm: { name: 'native', type: 'native' },
          email: 'test@example.com',
          full_name: 'Test User',
          lookup_realm: { name: 'native', type: 'native' },
          username: 'testuser',
        },
      });

      expect(result.email).toBe('test@example.com');
    });
  });
});
