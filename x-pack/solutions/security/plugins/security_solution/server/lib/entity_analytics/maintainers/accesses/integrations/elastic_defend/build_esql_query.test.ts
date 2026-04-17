/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlQuery } from './build_esql_query';

describe('Elastic Defend buildEsqlQuery', () => {
  it('uses the namespace to form the index pattern', () => {
    expect(buildEsqlQuery('default')).toContain('FROM logs-endpoint.events.security-default');
    expect(buildEsqlQuery('production')).toContain('FROM logs-endpoint.events.security-production');
  });

  it('filters for log_on events', () => {
    expect(buildEsqlQuery('default')).toContain('event.action == "log_on"');
  });

  it('filters for correct logon types', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('"RemoteInteractive"');
    expect(query).toContain('"Interactive"');
    expect(query).toContain('"Network"');
  });
});
