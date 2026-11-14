/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../common/search_strategy';
import {
  buildEuidRuntimeMappingWithStoredFieldFastPath,
  getBaseScoreESQL,
  getEuidCompositeQuery,
  getResolutionCompositeQuery,
  getResolutionScoreESQLByIds,
  getResolutionScoreESQLByRange,
} from './calculate_esql_risk_scores';

describe('Calculate risk scores with ESQL', () => {
  describe('getEuidCompositeQuery', () => {
    it('sets ignore_unavailable so a missing per-space alerts index behaves as empty', () => {
      const query = getEuidCompositeQuery(EntityType.host, [], { index: 'alerts-*', pageSize: 1 });
      expect(query.ignore_unavailable).toBe(true);
    });
  });

  describe('ESQL query', () => {
    it('builds resolution composite query for lookup index pagination', () => {
      const query = getResolutionCompositeQuery(
        EntityType.user,
        '.entity_analytics.risk_score.lookup-default',
        1000,
        {
          resolution_target_id: 'user:foo',
        }
      );

      expect(query).toEqual({
        index: '.entity_analytics.risk_score.lookup-default',
        size: 0,
        query: {
          bool: {
            filter: [
              { term: { relationship_type: 'entity.relationships.resolution.resolved_to' } },
              { prefix: { resolution_target_id: 'user:' } },
            ],
          },
        },
        aggs: {
          by_resolution_target: {
            composite: {
              size: 1000,
              sources: [{ resolution_target_id: { terms: { field: 'resolution_target_id' } } }],
              after: { resolution_target_id: 'user:foo' },
            },
          },
        },
      });
    });

    it('scopes query to targetEntityIds when they are provided', () => {
      const query = getResolutionCompositeQuery(
        EntityType.user,
        '.entity_analytics.risk_score.lookup-default',
        1000,
        undefined,
        ['user:target-1', 'user:target-2']
      );

      expect(query.query).toEqual({
        terms: { resolution_target_id: ['user:target-1', 'user:target-2'] },
      });
    });

    it('limits resolution pages to targets of the entity type being scored', () => {
      const hostQuery = getResolutionCompositeQuery(
        EntityType.host,
        '.entity_analytics.risk_score.lookup-default',
        1000
      );
      const userQuery = getResolutionCompositeQuery(
        EntityType.user,
        '.entity_analytics.risk_score.lookup-default',
        1000
      );

      expect(hostQuery.query).toEqual({
        bool: {
          filter: [
            { term: { relationship_type: 'entity.relationships.resolution.resolved_to' } },
            { prefix: { resolution_target_id: 'host:' } },
          ],
        },
      });
      expect(userQuery.query).toEqual({
        bool: {
          filter: [
            { term: { relationship_type: 'entity.relationships.resolution.resolved_to' } },
            { prefix: { resolution_target_id: 'user:' } },
          ],
        },
      });
    });

    it('builds resolution ESQL query for explicit resolution target ids', () => {
      const query = getResolutionScoreESQLByIds(
        EntityType.user,
        ['user:target-a', 'user:target-z'],
        5000,
        1000,
        '.alerts-security.alerts-default',
        '.entity_analytics.risk_score.lookup-default'
      );

      expect(query).toContain(
        'LOOKUP JOIN .entity_analytics.risk_score.lookup-default ON entity_id'
      );
      expect(query).toContain('resolution_target_id IN ("user:target-a", "user:target-z")');
      expect(query).toContain('BY resolution_target_id');
      expect(query).toContain('contributing_entities_raw = VALUES(entity_with_rel)');
    });

    it('keeps the alert timestamp when joining lookup rows that have their own', () => {
      const query = getResolutionScoreESQLByIds(
        EntityType.user,
        ['user:target-a'],
        5000,
        1000,
        '.alerts-security.alerts-default',
        '.entity_analytics.risk_score.lookup-default'
      );

      const renameIndex = query.indexOf('| RENAME @timestamp as time');
      expect(renameIndex).toBeGreaterThan(-1);
      expect(renameIndex).toBeLessThan(query.indexOf('| LOOKUP JOIN'));
    });

    it("selects a page of resolution groups by target range and this run's lookup rows", () => {
      const query = getResolutionScoreESQLByRange(
        EntityType.user,
        { lower: 'user:target-a', upper: 'user:target-m' },
        'run-1',
        5000,
        1000,
        '.alerts-security.alerts-default',
        '.entity_analytics.risk_score.lookup-default'
      );

      expect(query).toContain(
        '| WHERE calculation_run_id == "run-1" AND resolution_target_id > "user:target-a" AND resolution_target_id <= "user:target-m"'
      );
      expect(query).not.toContain('resolution_target_id IN (');
      expect(query).toContain('BY resolution_target_id');
      expect(query.indexOf('| RENAME @timestamp as time')).toBeLessThan(
        query.indexOf('| LOOKUP JOIN')
      );
    });

    it('omits the lower bound on the first page of resolution groups', () => {
      const query = getResolutionScoreESQLByRange(
        EntityType.user,
        { upper: 'user:target-m' },
        'run-1',
        5000,
        1000,
        '.alerts-security.alerts-default',
        '.entity_analytics.risk_score.lookup-default'
      );

      expect(query).toContain(
        '| WHERE calculation_run_id == "run-1" AND resolution_target_id <= "user:target-m"'
      );
      expect(query).not.toContain('resolution_target_id >');
    });

    it("keeps only this run's lookup rows, so a previous run's leftover rows form no groups", () => {
      // The lookup index is pruned after scoring, so while a run scores, a target whose aliases
      // have all moved elsewhere still has the row the previous run wrote for it.
      const query = getResolutionScoreESQLByRange(
        EntityType.user,
        { upper: 'user:target-m' },
        'run-2',
        5000,
        1000,
        '.alerts-security.alerts-default',
        '.entity_analytics.risk_score.lookup-default'
      );

      expect(query).toContain('| WHERE calculation_run_id == "run-2" AND');
      expect(query).not.toContain('resolution_target_id IS NOT NULL');
    });

    it('escapes quote and backslash characters in resolution target bounds', () => {
      const query = getResolutionScoreESQLByRange(
        EntityType.user,
        { lower: 'user:with"quote', upper: 'user:with\\slash' },
        'run-1',
        5000,
        1000,
        '.alerts-security.alerts-default',
        '.entity_analytics.risk_score.lookup-default'
      );

      expect(query).toContain('resolution_target_id > "user:with\\"quote"');
      expect(query).toContain('resolution_target_id <= "user:with\\\\slash"');
    });

    it('throws when resolution target bounds contain a control character', () => {
      expect(() =>
        getResolutionScoreESQLByRange(
          EntityType.user,
          { lower: 'user:target-a', upper: 'user:bad\u000A' },
          'run-1',
          5000,
          1000,
          '.alerts-security.alerts-default',
          '.entity_analytics.risk_score.lookup-default'
        )
      ).toThrow('Entity ID contains an unsupported control character');
    });

    it('escapes quote and backslash characters in resolution target ID list', () => {
      const query = getResolutionScoreESQLByIds(
        EntityType.user,
        ['user:target-a', 'user:with"quote\\slash@okta'],
        5000,
        1000,
        '.alerts-security.alerts-default',
        '.entity_analytics.risk_score.lookup-default'
      );

      expect(query).toContain('"user:target-a"');
      expect(query).toContain('"user:with\\"quote\\\\slash@okta"');
    });

    it.each([
      ['NUL', '\u0000'],
      ['LF', '\u000A'],
      ['CR', '\u000D'],
      ['LS', '\u2028'],
      ['PS', '\u2029'],
    ])('throws when resolution target id list contains %s control character', (_label, char) => {
      expect(() =>
        getResolutionScoreESQLByIds(
          EntityType.user,
          ['user:target-a', `user:bad${char}@okta`],
          5000,
          1000,
          '.alerts-security.alerts-default',
          '.entity_analytics.risk_score.lookup-default'
        )
      ).toThrow('Entity ID contains an unsupported control character');
    });

    it('escapes quote and backslash characters in getBaseScoreESQL bounds', () => {
      const query = getBaseScoreESQL(
        EntityType.host,
        { lower: 'host:edge"with-quote', upper: 'host:edge\\with-slash' },
        10000,
        3500,
        '.alerts-security.alerts-default'
      );

      expect(query).toContain('entity_id > "host:edge\\"with-quote"');
      expect(query).toContain('entity_id <= "host:edge\\\\with-slash"');
    });

    it.each([
      ['NUL', '\u0000'],
      ['LF', '\u000A'],
      ['CR', '\u000D'],
      ['LS', '\u2028'],
      ['PS', '\u2029'],
    ])('throws when getBaseScoreESQL bounds contain %s control character', (_label, char) => {
      expect(() =>
        getBaseScoreESQL(
          EntityType.host,
          { lower: 'host:abel', upper: `host:bad${char}` },
          10000,
          3500,
          '.alerts-security.alerts-default'
        )
      ).toThrow('Entity ID contains an unsupported control character');
    });

    it.each([
      ['whitespace/METADATA injection', '.alerts-security.alerts-default METADATA _index'],
      ['pipe injection', '.alerts-security.alerts-default | LIMIT 0'],
      ['comment injection', '.alerts-security.alerts-default,zz* | LIMIT 0 //'],
      [
        'report payload A',
        '.alerts-security.alerts-alpha,.alerts-security.alerts-beta,zz* METADATA _index,/* * */_source',
      ],
    ])('throws when the source index is not a valid index expression (%s)', (_label, index) => {
      const message = `Risk scoring source index ${index} is not a valid index expression`;

      expect(() =>
        getBaseScoreESQL(
          EntityType.host,
          { lower: 'host:abel', upper: 'host:zuzanna' },
          10000,
          3500,
          index
        )
      ).toThrow(message);
      expect(() =>
        getResolutionScoreESQLByIds(
          EntityType.host,
          ['host:target-a'],
          10000,
          3500,
          index,
          '.entity_analytics.risk_score.lookup-default'
        )
      ).toThrow(message);
    });

    it('ranks risk inputs by the numeric risk score in every scoring query', () => {
      const queries = [
        getBaseScoreESQL(
          EntityType.host,
          { lower: 'host:abel', upper: 'host:zuzanna' },
          10000,
          3500,
          '.alerts-security.alerts-default'
        ),
        getResolutionScoreESQLByIds(
          EntityType.host,
          ['host:target-a'],
          10000,
          3500,
          '.alerts-security.alerts-default',
          '.entity_analytics.risk_score.lookup-default'
        ),
      ];

      for (const query of queries) {
        expect(query).toContain('risk_inputs = TOP(risk_score, 10, "desc", input)');
      }
    });
  });

  describe('stored-EUID fast path', () => {
    describe('buildEuidRuntimeMappingWithStoredFieldFastPath', () => {
      it('reads the stored kibana.alert.entity.id array first and short-circuits on a type-prefixed match', () => {
        const mapping = buildEuidRuntimeMappingWithStoredFieldFastPath(EntityType.host);

        expect(mapping.type).toBe('keyword');
        const { source } = mapping.script;
        expect(source).toContain("doc.containsKey('kibana.alert.entity.id')");
        expect(source).toContain("for (def __id : doc['kibana.alert.entity.id'])");
        expect(source).toContain("__id.startsWith('host:')");
        expect(source).toContain('emit(__id); return;');
        // The full Painless derivation remains as the fallback for alerts written before the stamp.
        expect(source).toContain('String ___euid = ___euid_rt_eval(doc);');
      });

      it('guards the fast path with the entity type prefix for user', () => {
        const { script } = buildEuidRuntimeMappingWithStoredFieldFastPath(EntityType.user);

        expect(script.source).toContain("__id.startsWith('user:')");
        expect(script.source).not.toContain("__id.startsWith('host:')");
      });

      it('does not gate the fallback derivation on postAggFilter', () => {
        const { script } = buildEuidRuntimeMappingWithStoredFieldFastPath(EntityType.user);

        // `entity.id exists` is the postAggFilter-only arm, so its absence proves the gate was dropped.
        expect(script.source).not.toContain(`doc.containsKey('entity.id')`);
        // documentsFilter still applies.
        expect(script.source).toContain(`doc.containsKey('user.name')`);
      });
    });

    describe('storedEuidCoalesceClause', () => {
      it('emits the coalesce clause in getBaseScoreESQL for host, scanning all three array positions', () => {
        const query = getBaseScoreESQL(
          EntityType.host,
          { lower: 'host:a', upper: 'host:z' },
          10000,
          3500,
          '.alerts-security.alerts-default'
        );

        expect(query).toContain(
          'EVAL entity_id = CASE(STARTS_WITH(MV_FIRST(MV_SLICE(kibana.alert.entity.id, 0, 0)), "host:")'
        );
        expect(query).toContain('MV_SLICE(kibana.alert.entity.id, 1, 1)');
        expect(query).toContain('MV_SLICE(kibana.alert.entity.id, 2, 2)');
      });

      it.each([EntityType.host, EntityType.user])(
        'counts the alerts of each %s entity per source, before the entity id column',
        (entityType) => {
          const query = getBaseScoreESQL(
            entityType,
            { lower: `${entityType}:a`, upper: `${entityType}:z` },
            10000,
            3500,
            '.alerts-security.alerts-default'
          );

          expect(query).toContain('EVAL alert_source = COALESCE(entity.source, "unknown")');
          expect(query).toContain(
            'INLINE STATS source_alert_count = COUNT(*) BY entity_id, alert_source'
          );
          expect(query).toContain(
            'EVAL alert_source_count = CONCAT(TO_STRING(source_alert_count), ":", alert_source)'
          );
          expect(query).toMatch(/alert_sources = VALUES\(alert_source_count\)\s+BY entity_id/);
          expect(query.indexOf('WHERE entity_id >')).toBeLessThan(query.indexOf('INLINE STATS'));
          expect(query.indexOf('entity.source =')).toBeLessThan(query.indexOf('alert_source ='));
        }
      );

      it('emits the coalesce clause in getBaseScoreESQL for user', () => {
        const query = getBaseScoreESQL(
          EntityType.user,
          { lower: 'user:a', upper: 'user:z' },
          10000,
          3500,
          '.alerts-security.alerts-default'
        );

        expect(query).toContain(
          'STARTS_WITH(MV_FIRST(MV_SLICE(kibana.alert.entity.id, 0, 0)), "user:")'
        );
      });

      it('emits the coalesce clause in getResolutionScoreESQLByIds for host and user', () => {
        const hostQuery = getResolutionScoreESQLByIds(
          EntityType.host,
          ['host:target-a'],
          5000,
          1000,
          '.alerts-security.alerts-default',
          '.entity_analytics.risk_score.lookup-default'
        );
        expect(hostQuery).toContain(
          'STARTS_WITH(MV_FIRST(MV_SLICE(kibana.alert.entity.id, 0, 0)), "host:")'
        );

        const userQuery = getResolutionScoreESQLByIds(
          EntityType.user,
          ['user:target-a'],
          5000,
          1000,
          '.alerts-security.alerts-default',
          '.entity_analytics.risk_score.lookup-default'
        );
        expect(userQuery).toContain(
          'STARTS_WITH(MV_FIRST(MV_SLICE(kibana.alert.entity.id, 0, 0)), "user:")'
        );
      });
    });
  });
});
