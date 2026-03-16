/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlQuery } from './build_esql_query';

describe('AWS CloudTrail buildEsqlQuery', () => {
  describe('namespace handling', () => {
    it('uses the namespace to form the index pattern', () => {
      const query = buildEsqlQuery('default');
      expect(query).toContain('FROM logs-aws.cloudtrail-default');
    });

    it('uses a custom namespace', () => {
      const query = buildEsqlQuery('production');
      expect(query).toContain('FROM logs-aws.cloudtrail-production');
    });
  });

  describe('entity fields', () => {
    it('computes entity.namespace via field evaluations', () => {
      const query = buildEsqlQuery('default');
      expect(query).toContain('entity.namespace');
    });

    it('contains user identity fields', () => {
      const query = buildEsqlQuery('default');
      expect(query).toContain('user.id');
      expect(query).toContain('user.name');
    });

    it('contains host identity fields', () => {
      const query = buildEsqlQuery('default');
      expect(query).toContain('host.id');
      expect(query).toContain('host.name');
    });
  });

  describe('query structure', () => {
    it('filters for AWS module and StartSession action', () => {
      const query = buildEsqlQuery('default');
      expect(query).toContain('event.module == "aws"');
      expect(query).toContain('event.action == "StartSession"');
    });

    it('does not filter on event.provider or logon_type', () => {
      const query = buildEsqlQuery('default');
      expect(query).not.toContain('event.provider');
      expect(query).not.toContain('logon_type');
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

    it('applies a LIMIT matching the composite page size', () => {
      const query = buildEsqlQuery('default');
      expect(query).toContain('| LIMIT 3500');
    });
  });
});
