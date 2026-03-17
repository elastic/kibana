/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlQuery } from './build_esql_query';

describe('System Security buildEsqlQuery', () => {
  it('uses the namespace to form the index pattern', () => {
    expect(buildEsqlQuery('default')).toContain('FROM logs-system.security-default');
    expect(buildEsqlQuery('production')).toContain('FROM logs-system.security-production');
  });

  it('filters for logged-in and logged-in-explicit actions', () => {
    expect(buildEsqlQuery('default')).toContain(
      'event.action IN ("logged-in", "logged-in-explicit")'
    );
  });

  it('filters for Interactive and RemoteInteractive logon types', () => {
    expect(buildEsqlQuery('default')).toContain(
      'winlog.logon.type IN ("Interactive", "RemoteInteractive")'
    );
  });

  it('does not filter on event.module or event.category', () => {
    const query = buildEsqlQuery('default');
    expect(query).not.toContain('event.module ==');
    expect(query).not.toContain('event.category');
  });
});
