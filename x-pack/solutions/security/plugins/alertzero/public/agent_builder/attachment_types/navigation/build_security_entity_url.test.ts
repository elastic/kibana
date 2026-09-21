/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSecurityEntityUrl } from './build_security_entity_url';

describe('buildSecurityEntityUrl', () => {
  it('builds a hosts deep link for a host.* field', () => {
    const getUrlForApp = jest
      .fn()
      .mockReturnValue('https://kbn.test/app/security/hosts/name/WIN-ANALYST01');
    const url = buildSecurityEntityUrl({
      getUrlForApp,
      field: 'host.name',
      value: 'WIN-ANALYST01',
    });

    expect(getUrlForApp).toHaveBeenCalledWith('securitySolutionUI', {
      deepLinkId: 'hosts',
      path: '/name/WIN-ANALYST01',
    });
    expect(url).toBe('https://kbn.test/app/security/hosts/name/WIN-ANALYST01');
  });

  it('builds a users deep link for a user.* field', () => {
    const getUrlForApp = jest
      .fn()
      .mockReturnValue('https://kbn.test/app/security/users/name/dev-user');
    const url = buildSecurityEntityUrl({ getUrlForApp, field: 'user.name', value: 'dev-user' });

    expect(getUrlForApp).toHaveBeenCalledWith('securitySolutionUI', {
      deepLinkId: 'users',
      path: '/name/dev-user',
    });
    expect(url).toBe('https://kbn.test/app/security/users/name/dev-user');
  });

  it('returns undefined for a service.* field', () => {
    const getUrlForApp = jest.fn();
    const url = buildSecurityEntityUrl({ getUrlForApp, field: 'service.name', value: 'checkout' });

    expect(url).toBeUndefined();
    expect(getUrlForApp).not.toHaveBeenCalled();
  });

  it('returns undefined when getUrlForApp is not provided', () => {
    const url = buildSecurityEntityUrl({ field: 'host.name', value: 'WIN-ANALYST01' });

    expect(url).toBeUndefined();
  });

  it('URL-encodes the entity value', () => {
    const getUrlForApp = jest.fn().mockReturnValue('encoded');
    buildSecurityEntityUrl({ getUrlForApp, field: 'host.name', value: 'host name/with slash' });

    expect(getUrlForApp).toHaveBeenCalledWith('securitySolutionUI', {
      deepLinkId: 'hosts',
      path: '/name/host%20name%2Fwith%20slash',
    });
  });
});
