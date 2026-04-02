/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';

import { buildEsqlQuery } from './build_esql_query';

describe('communicates_with Azure Sign-in Logs buildEsqlQuery', () => {
  it('uses the namespace to form the index pattern', () => {
    expect(buildEsqlQuery('default')).toContain('FROM logs-azure.signinlogs-default');
    expect(buildEsqlQuery('production')).toContain('FROM logs-azure.signinlogs-production');
  });

  it('sets unmapped_fields to nullify so unmapped columns become NULL instead of errors', () => {
    const query = buildEsqlQuery('default');
    expect(query).toMatch(/^SET unmapped_fields="nullify";\n/);
  });

  it('requires app_display_name to be non-null', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('azure.signinlogs.properties.app_display_name IS NOT NULL');
  });

  it('uses the standard user EUID documents-contains-id filter', () => {
    const query = buildEsqlQuery('default');
    const userIdFilter = euid.esql.getEuidDocumentsContainsIdFilter('user');
    expect(query).toContain(userIdFilter);
  });

  it('uses EUID field evaluations for entity.namespace derivation', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('entity.namespace');
    expect(query).toContain('EVAL');
  });

  it('derives actorUserId from the standard user EUID evaluation', () => {
    const query = buildEsqlQuery('default');
    const userEuidEval = euid.esql.getEuidEvaluation('user', { withTypeId: true });
    expect(query).toContain(`actorUserId = ${userEuidEval}`);
  });

  it('constructs target EUID as service: + app_display_name', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('CONCAT("service:", azure.signinlogs.properties.app_display_name)');
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

  it('does not fall back to resource_display_name', () => {
    const query = buildEsqlQuery('default');
    expect(query).not.toContain('resource_display_name');
  });
});
