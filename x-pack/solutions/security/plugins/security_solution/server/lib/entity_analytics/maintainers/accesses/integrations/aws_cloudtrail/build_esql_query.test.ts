/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlQuery } from './build_esql_query';

describe('AWS CloudTrail buildEsqlQuery', () => {
  it('uses the namespace to form the index pattern', () => {
    expect(buildEsqlQuery('default')).toContain('FROM logs-aws.cloudtrail-default');
    expect(buildEsqlQuery('production')).toContain('FROM logs-aws.cloudtrail-production');
  });

  it('filters for AWS module and StartSession or SendSSHPublicKey actions', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('event.module == "aws"');
    expect(query).toContain('"StartSession"');
    expect(query).toContain('"SendSSHPublicKey"');
  });

  it('does not filter on event.provider or logon_type', () => {
    const query = buildEsqlQuery('default');
    expect(query).not.toContain('event.provider');
    expect(query).not.toContain('logon_type');
  });
});
