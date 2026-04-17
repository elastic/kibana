/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlQuery } from './build_esql_query';
import {
  AZURE_AUDITLOGS_ACTOR_UPN_FIELD,
  AZURE_AUDITLOGS_TARGET_UPN_FIELD,
  AZURE_AUDITLOGS_TARGET_TYPE_FIELD,
  AZURE_AUDITLOGS_TARGET_DISPLAY_NAME_FIELD,
} from './constants';

describe('communicates_with Azure Audit Logs buildEsqlQuery', () => {
  it('uses the namespace to form the index pattern', () => {
    expect(buildEsqlQuery('default')).toContain('FROM logs-azure.auditlogs-default');
    expect(buildEsqlQuery('production')).toContain('FROM logs-azure.auditlogs-production');
  });

  it('sets unmapped_fields to nullify so unmapped columns become NULL instead of errors', () => {
    const query = buildEsqlQuery('default');
    expect(query).toMatch(/^SET unmapped_fields="nullify";\n/);
  });

  it('requires actor UPN to be non-null', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain(`${AZURE_AUDITLOGS_ACTOR_UPN_FIELD} IS NOT NULL`);
  });

  it('backtick-escapes target_resources fields to avoid ES|QL numeric path parse errors', () => {
    const query = buildEsqlQuery('default');
    // .0. in a field name is misread as a decimal literal — must be backtick-escaped
    expect(query).toContain(`\`${AZURE_AUDITLOGS_TARGET_TYPE_FIELD}\``);
    expect(query).toContain(`\`${AZURE_AUDITLOGS_TARGET_UPN_FIELD}\``);
    expect(query).toContain(`\`${AZURE_AUDITLOGS_TARGET_DISPLAY_NAME_FIELD}\``);
    // Actor UPN has no numeric component — must NOT be wrapped in backticks
    expect(query).not.toContain(`\`${AZURE_AUDITLOGS_ACTOR_UPN_FIELD}\``);
  });

  it('accepts User-type targets when target UPN is present', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain(`\`${AZURE_AUDITLOGS_TARGET_TYPE_FIELD}\` == "User"`);
    expect(query).toContain(`\`${AZURE_AUDITLOGS_TARGET_UPN_FIELD}\` IS NOT NULL`);
  });

  it('accepts Device-type targets when display name is present', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain(`\`${AZURE_AUDITLOGS_TARGET_TYPE_FIELD}\` == "Device"`);
    expect(query).toContain(`\`${AZURE_AUDITLOGS_TARGET_DISPLAY_NAME_FIELD}\` IS NOT NULL`);
  });

  it('constructs actor EUID as user:{upn}@entra_id', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain(`CONCAT("user:", ${AZURE_AUDITLOGS_ACTOR_UPN_FIELD}, "@entra_id")`);
  });

  it('constructs User target EUID as user:{upn}@entra_id', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain(
      `CONCAT("user:", \`${AZURE_AUDITLOGS_TARGET_UPN_FIELD}\`, "@entra_id")`
    );
  });

  it('constructs Device target EUID as host:{displayName}', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain(`CONCAT("host:", \`${AZURE_AUDITLOGS_TARGET_DISPLAY_NAME_FIELD}\`)`);
  });

  it('uses CASE to select the correct target EUID by type', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('CASE(');
  });

  it('guards against empty actor EUID', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('actorUserId != "user:@entra_id"');
  });

  it('guards against empty host target EUID', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('targetEntityId != "host:"');
  });

  it('guards against empty user target EUID', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('targetEntityId != "user:@entra_id"');
  });

  it('does not reference the old signinlogs fields or service: pattern', () => {
    const query = buildEsqlQuery('default');
    expect(query).not.toContain('signinlogs');
    expect(query).not.toContain('"service:"');
    expect(query).not.toContain('app_display_name');
  });

  it('aggregates communicates_with targets per user', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('communicates_with = VALUES(targetEntityId)');
    expect(query).toContain('BY actorUserId');
  });
});
