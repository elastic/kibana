/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlQuery } from './build_esql_query';
import { OKTA_AUTH_EVENT_ACTIONS } from './constants';

describe('communicates_with Okta buildEsqlQuery', () => {
  it('uses the namespace to form the index pattern', () => {
    expect(buildEsqlQuery('default')).toContain('FROM logs-okta.system-default');
    expect(buildEsqlQuery('production')).toContain('FROM logs-okta.system-production');
  });

  it('sets unmapped_fields to nullify so unmapped columns become NULL instead of errors', () => {
    const query = buildEsqlQuery('default');
    expect(query).toMatch(/^SET unmapped_fields="nullify";\n/);
  });

  it('filters for auth event actions', () => {
    const query = buildEsqlQuery('default');
    for (const action of OKTA_AUTH_EVENT_ACTIONS) {
      expect(query).toContain(`"${action}"`);
    }
    expect(query).toContain('event.action IN (');
  });

  it('requires okta.target.display_name to be non-null', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('okta.target.display_name IS NOT NULL');
  });

  it('uses MV_EXPAND to unroll multi-value target display names', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('MV_EXPAND okta.target.display_name');
  });

  it('constructs target EUID as service: + display_name', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('CONCAT("service:", okta.target.display_name)');
  });

  it('aggregates communicates_with targets per user', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('communicates_with = VALUES(targetEntityId)');
    expect(query).toContain('BY actorUserId');
  });

  it('does not add an explicit success-only filter', () => {
    const query = buildEsqlQuery('default');
    expect(query).not.toContain('event.outcome == "success"');
  });
});
