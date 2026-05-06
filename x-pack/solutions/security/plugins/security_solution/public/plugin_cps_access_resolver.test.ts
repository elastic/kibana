/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProjectRoutingAccess } from '@kbn/cps-utils';
import {
  DASHBOARDS_PATH,
  EXPLORE_PATH,
  HOSTS_PATH,
  NETWORK_PATH,
  USERS_PATH,
} from '../common/constants';
import { createCpsAccessResolver } from './plugin';

const EDITABLE_ROUTES = [HOSTS_PATH, USERS_PATH, NETWORK_PATH, EXPLORE_PATH, DASHBOARDS_PATH];

describe('createCpsAccessResolver', () => {
  const resolver = createCpsAccessResolver(EDITABLE_ROUTES);

  describe('EDITABLE routes', () => {
    it.each([
      ['hosts listing', '/app/security/hosts'],
      ['hosts detail', '/app/security/hosts/web-01'],
      ['users listing', '/app/security/users'],
      ['users detail', '/app/security/users/alice'],
      ['network listing', '/app/security/network'],
      ['explore landing', '/app/security/explore'],
      ['dashboards individual view', '/app/security/dashboards/some-id'],
    ])('returns EDITABLE for %s (%s)', (_label, location) => {
      expect(resolver(location)).toBe(ProjectRoutingAccess.EDITABLE);
    });
  });

  describe('DISABLED routes', () => {
    it.each([
      ['rules', '/app/security/rules'],
      ['cases', '/app/security/cases'],
      ['attack discovery', '/app/security/attack_discovery'],
      ['alerts', '/app/security/alerts'],
      ['exceptions', '/app/security/exceptions'],
      ['app root', '/app/security'],
      ['unrelated path', '/app/kibana/dashboard'],
    ])('returns DISABLED for %s (%s)', (_label, location) => {
      expect(resolver(location)).toBe(ProjectRoutingAccess.DISABLED);
    });
  });
});
