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

  it('filters for event.code 4624 and 4648', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('event.code IN ("4624", "4648")');
  });

  it('filters for Interactive, RemoteInteractive, and CachedInteractive logon types', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('"Interactive"');
    expect(query).toContain('"RemoteInteractive"');
    expect(query).toContain('"CachedInteractive"');
  });

  it('excludes service and system accounts', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('NOT user.name IN (');
    expect(query).toContain('"SYSTEM"');
    expect(query).toContain('"LOCAL SERVICE"');
    expect(query).toContain('"NETWORK SERVICE"');
    expect(query).toContain('"ANONYMOUS LOGON"');
  });
});
