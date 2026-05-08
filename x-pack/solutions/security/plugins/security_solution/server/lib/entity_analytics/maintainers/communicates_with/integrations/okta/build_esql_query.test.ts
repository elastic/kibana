/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlQuery } from './build_esql_query';
import { OKTA_USER_ADMIN_EVENT_ACTIONS } from './constants';

describe('communicates_with Okta buildEsqlQuery', () => {
  it('uses the namespace to form the index pattern', () => {
    expect(buildEsqlQuery('default')).toContain('FROM logs-okta.system-default');
    expect(buildEsqlQuery('production')).toContain('FROM logs-okta.system-production');
  });

  it('sets unmapped_fields to nullify so unmapped columns become NULL instead of errors', () => {
    const query = buildEsqlQuery('default');
    expect(query).toMatch(/^SET unmapped_fields="nullify";\n/);
  });

  it('filters for user admin event actions', () => {
    const query = buildEsqlQuery('default');
    for (const action of OKTA_USER_ADMIN_EVENT_ACTIONS) {
      expect(query).toContain(`"${action}"`);
    }
    expect(query).toContain('event.action IN (');
  });

  it('requires user.target.email to be non-null (does not fall back to raw user.target.id)', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('user.target.email IS NOT NULL');
    expect(query).not.toContain('user.target.id IS NOT NULL');
    expect(query).not.toContain('COALESCE(user.target.email, user.target.id)');
  });

  it('constructs target EUID as user: + email + @okta', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('CONCAT("user:", user.target.email, "@okta")');
  });

  it('guards against empty target EUID', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('targetEntityId != "user:@okta"');
  });

  it('does not use MV_EXPAND (no multi-value target field)', () => {
    const query = buildEsqlQuery('default');
    expect(query).not.toContain('MV_EXPAND');
  });

  it('does not reference the old service: target pattern', () => {
    const query = buildEsqlQuery('default');
    expect(query).not.toContain('"service:"');
    expect(query).not.toContain('okta.target.display_name');
  });

  it('aggregates communicates_with targets per user', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('communicates_with = VALUES(targetEntityId)');
    expect(query).toContain('BY actorUserId');
  });
});
