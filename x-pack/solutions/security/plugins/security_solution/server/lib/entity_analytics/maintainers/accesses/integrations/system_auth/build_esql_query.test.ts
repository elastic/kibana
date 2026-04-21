/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlQuery } from './build_esql_query';

describe('System Auth buildEsqlQuery', () => {
  it('uses the namespace to form the index pattern', () => {
    expect(buildEsqlQuery('default')).toContain('FROM logs-system.auth-default');
    expect(buildEsqlQuery('production')).toContain('FROM logs-system.auth-production');
  });

  it('filters for authentication or session event category', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('event.category IN ("authentication", "session")');
  });

  it('filters for ssh_login action', () => {
    expect(buildEsqlQuery('default')).toContain('event.action == "ssh_login"');
  });

  it('does not filter on event.module as a WHERE condition', () => {
    const query = buildEsqlQuery('default');
    expect(query).not.toContain('event.module ==');
    expect(query).not.toContain('logon_type');
  });
});
