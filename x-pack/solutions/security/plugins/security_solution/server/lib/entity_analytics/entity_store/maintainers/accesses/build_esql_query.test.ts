/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlQuery } from './build_esql_query';

describe('buildEsqlQuery', () => {
  describe('namespace handling', () => {
    it('uses the namespace to form the index pattern', () => {
      const query = buildEsqlQuery('default');
      expect(query).toContain('FROM logs-endpoint.events.security-default');
    });

    it('uses a custom namespace', () => {
      const query = buildEsqlQuery('production');
      expect(query).toContain('FROM logs-endpoint.events.security-production');
    });
  });

  describe('skipEntityFields=false (default)', () => {
    it('includes entity.id references in the query', () => {
      const query = buildEsqlQuery('default', false);
      expect(query).toContain('.entity.');
    });
  });

  describe('skipEntityFields=true', () => {
    it('does not contain any .entity. references', () => {
      const query = buildEsqlQuery('default', true);
      expect(query).not.toContain('.entity.');
    });

    it('still contains non-entity user identity fields', () => {
      const query = buildEsqlQuery('default', true);
      expect(query).toContain('user.id');
      expect(query).toContain('user.name');
    });

    it('still contains non-entity host identity fields', () => {
      const query = buildEsqlQuery('default', true);
      expect(query).toContain('host.id');
      expect(query).toContain('host.name');
    });
  });

  describe('query structure', () => {
    it('filters for log_on events', () => {
      const query = buildEsqlQuery('default');
      expect(query).toContain('event.action == "log_on"');
    });

    it('filters for correct logon types', () => {
      const query = buildEsqlQuery('default');
      expect(query).toContain('"RemoteInteractive"');
      expect(query).toContain('"Interactive"');
      expect(query).toContain('"Network"');
    });

    it('filters for successful outcomes', () => {
      const query = buildEsqlQuery('default');
      expect(query).toContain('event.outcome == "success"');
    });

    it('computes actorUserId via EVAL', () => {
      const query = buildEsqlQuery('default');
      expect(query).toContain('EVAL actorUserId =');
    });

    it('computes targetEntityId with COALESCE fallback to host.ip and host.mac', () => {
      const query = buildEsqlQuery('default');
      expect(query).toContain('COALESCE(');
      expect(query).toContain('TO_STRING(host.ip)');
      expect(query).toContain('TO_STRING(host.mac)');
    });

    it('uses MV_EXPAND on targetEntityId', () => {
      const query = buildEsqlQuery('default');
      expect(query).toContain('MV_EXPAND targetEntityId');
    });

    it('uses access_count > 4 as the frequency threshold', () => {
      const query = buildEsqlQuery('default');
      expect(query).toContain('access_count > 4');
    });

    it('classifies into accesses_frequently and accesses_infrequently', () => {
      const query = buildEsqlQuery('default');
      expect(query).toContain('"accesses_frequently"');
      expect(query).toContain('"accesses_infrequently"');
    });

    it('groups final output by actorUserId', () => {
      const query = buildEsqlQuery('default');
      expect(query).toMatch(/BY actorUserId$/m);
    });
  });

  describe('consistency between skipEntityFields modes', () => {
    it('both modes produce valid FROM clauses with the same index', () => {
      const withEntity = buildEsqlQuery('test-ns', false);
      const withoutEntity = buildEsqlQuery('test-ns', true);
      expect(withEntity).toContain('FROM logs-endpoint.events.security-test-ns');
      expect(withoutEntity).toContain('FROM logs-endpoint.events.security-test-ns');
    });

    it('both modes use the same frequency threshold', () => {
      const withEntity = buildEsqlQuery('default', false);
      const withoutEntity = buildEsqlQuery('default', true);
      expect(withEntity).toContain('access_count > 4');
      expect(withoutEntity).toContain('access_count > 4');
    });

    it('skipEntityFields query is a subset (shorter or equal) in the entity-related sections', () => {
      const withEntity = buildEsqlQuery('default', false);
      const withoutEntity = buildEsqlQuery('default', true);
      expect(withoutEntity.length).toBeLessThanOrEqual(withEntity.length);
    });
  });
});
