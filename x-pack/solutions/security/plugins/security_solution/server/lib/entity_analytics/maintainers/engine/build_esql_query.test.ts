/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlQuery } from './build_esql_query';
import type { RelationshipIntegrationConfig } from './types';

const accessesConfig: RelationshipIntegrationConfig = {
  id: 'elastic_defend',
  name: 'Elastic Defend',
  indexPattern: (ns) => `logs-endpoint.events.security-${ns}`,
  relationshipType: 'accesses',
  targetEntityType: 'host',
  compositeAggFilters: [],
  esqlWhereClause: 'event.action == "log_on" AND process.Ext.session_info.logon_type IN ("RemoteInteractive", "Interactive", "Network")',
};

const commWithHostConfig: RelationshipIntegrationConfig = {
  id: 'jamf_pro',
  name: 'Jamf Pro',
  indexPattern: (ns) => `logs-jamf_pro.events-${ns}`,
  relationshipType: 'communicates_with',
  targetEntityType: 'host',
  compositeAggFilters: [],
  esqlWhereClause: 'user.name IS NOT NULL',
};

const commWithUserConfig: RelationshipIntegrationConfig = {
  id: 'okta',
  name: 'Okta',
  indexPattern: (ns) => `logs-okta.system-${ns}`,
  relationshipType: 'communicates_with',
  targetEntityType: 'user',
  compositeAggFilters: [],
  esqlWhereClause: 'event.action IN ("user.lifecycle.create") AND user.target.email IS NOT NULL',
  targetEvalOverride: 'CONCAT("user:", user.target.email, "@okta")',
  additionalTargetFilter: 'AND targetEntityId != "user:@okta"',
};

describe('buildEsqlQuery', () => {
  it('uses esqlQueryOverride when provided', () => {
    const override = jest.fn().mockReturnValue('FROM test | LIMIT 1');
    buildEsqlQuery({ ...accessesConfig, esqlQueryOverride: override }, 'default');
    expect(override).toHaveBeenCalledWith('default');
  });

  describe('accesses template', () => {
    it('uses the namespace-derived index pattern', () => {
      expect(buildEsqlQuery(accessesConfig, 'prod')).toContain('logs-endpoint.events.security-prod');
    });

    it('includes the integration esqlWhereClause', () => {
      expect(buildEsqlQuery(accessesConfig, 'default')).toContain('event.action == "log_on"');
    });

    it('adds event.outcome == "success" filter', () => {
      expect(buildEsqlQuery(accessesConfig, 'default')).toContain('event.outcome == "success"');
    });

    it('produces accesses_frequently and accesses_infrequently STATS columns', () => {
      const query = buildEsqlQuery(accessesConfig, 'default');
      expect(query).toContain('accesses_frequently');
      expect(query).toContain('accesses_infrequently');
    });

    it('uses the default frequencyThreshold of 4', () => {
      expect(buildEsqlQuery(accessesConfig, 'default')).toContain('>= 4');
    });

    it('uses a custom frequencyThreshold when provided', () => {
      expect(
        buildEsqlQuery({ ...accessesConfig, frequencyThreshold: 10 }, 'default')
      ).toContain('>= 10');
    });
  });

  describe('communicates_with template', () => {
    it('produces a communicates_with STATS column', () => {
      expect(buildEsqlQuery(commWithHostConfig, 'default')).toContain('communicates_with');
    });

    it('does not have explicit event.outcome filter line like accesses does', () => {
      const commWithHostQuery = buildEsqlQuery(commWithHostConfig, 'default');
      const accessesQuery = buildEsqlQuery(accessesConfig, 'default');

      // Accesses should have explicit "AND event.outcome == "success"" on its own line
      expect(accessesQuery).toMatch(/\n\s*AND event\.outcome == "success"/);

      // Communicates_with should not have this explicit line
      expect(commWithHostQuery).not.toMatch(/\n\s*AND event\.outcome == "success"/);
    });

    it('includes host ID filter when targetEntityType is host', () => {
      const query = buildEsqlQuery(commWithHostConfig, 'default');
      expect(query.toLowerCase()).toContain('host');
    });

    it('does NOT include host ID filter when targetEntityType is user', () => {
      const query = buildEsqlQuery(commWithUserConfig, 'default');
      expect(query).toContain('communicates_with');
      // host ID filter line should not be present for user targets
      // The host filter would be "AND (`host.id` IS NOT NULL..." on a new line after userIdFilter
      expect(query).not.toMatch(/AND \(`host\.(id|name|hostname)`/);
    });

    it('uses targetEvalOverride when provided', () => {
      expect(buildEsqlQuery(commWithUserConfig, 'default')).toContain('@okta');
    });

    it('appends additionalTargetFilter when provided', () => {
      expect(buildEsqlQuery(commWithUserConfig, 'default')).toContain('"user:@okta"');
    });
  });
});
