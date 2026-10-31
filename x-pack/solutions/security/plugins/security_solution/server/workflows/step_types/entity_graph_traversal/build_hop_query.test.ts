/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraversalHop } from '../../../../common/workflows/step_types/entity_graph_traversal/entity_graph_traversal_common';
import {
  buildHopQuery,
  frontierForMatchField,
  HOP_QUERY_PREAMBLE,
  lookbackToEsqlSpan,
} from './build_hop_query';

const hop: TraversalHop = {
  hop_number: 2,
  name: 'aws_asset_relationships',
  index: 'logs-cloud_asset_inventory.asset_inventory-*',
  match_field: 'entity.id',
  target_fields: [
    { field: 'entity.relationships.can_assume.entity.id', relation: 'can_assume' },
    { field: 'entity.relationships.runs_as.entity.id', relation: 'runs_as' },
  ],
  payload_fields: ['entity.name', 'entity.sub_type'],
  filter: 'cloud.provider == "aws"',
  time_field: '@timestamp',
};

const euidHop: TraversalHop = {
  hop_number: 1,
  name: 'okta_federation_roles',
  index: 'logs-entityanalytics_okta.user-*',
  match_euid: 'user',
  target_fields: [
    { field: 'user.entity.relationships.can_assume.entity.id', relation: 'can_assume' },
  ],
  payload_fields: ['user.group.name'],
};

describe('buildHopQuery', () => {
  describe('match_field', () => {
    it('binds the frontier as positional parameters and never interpolates ids', () => {
      const frontier = ['arn:aws:iam::1:role/a', 'arn:aws:iam::1:role/b"; DROP'];
      const { query, params } = buildHopQuery({
        hop,
        target: { field: hop.target_fields[0].field },
        frontier,
        limit: 500,
      });
      expect(params).toEqual(frontier);
      expect(query).not.toContain('role/a');
      expect(query).toContain('IN (?, ?)');
    });

    it('produces the expected ES|QL pipeline', () => {
      const { query } = buildHopQuery({
        hop,
        target: { field: hop.target_fields[0].field },
        frontier: ['x'],
        limit: 500,
        lookback: '7d',
      });
      expect(query).toBe(
        [
          HOP_QUERY_PREAMBLE,
          'FROM logs-cloud_asset_inventory.asset_inventory-*',
          '| WHERE `entity.id` IN (?) AND `entity.relationships.can_assume.entity.id` IS NOT NULL',
          '| WHERE (cloud.provider == "aws")',
          '| WHERE `@timestamp` >= NOW() - 7 days',
          '| MV_EXPAND `entity.relationships.can_assume.entity.id`',
          '| STATS __count = COUNT(*), __payload_0 = VALUES(`entity.name`), __payload_1 = VALUES(`entity.sub_type`) BY __source = `entity.id`, __target = `entity.relationships.can_assume.entity.id`',
          '| LIMIT 500',
        ].join('\n')
      );
    });

    it('omits the time filter when the hop has no time_field', () => {
      const { query } = buildHopQuery({
        hop: { ...hop, time_field: undefined, filter: undefined, payload_fields: [] },
        target: { field: hop.target_fields[1].field },
        frontier: ['x'],
        limit: 10,
        lookback: '24h',
      });
      expect(query).not.toContain('NOW()');
      expect(query).not.toContain('| WHERE (');
      expect(query).toContain('| STATS __count = COUNT(*) BY __source');
      expect(query).toContain('| LIMIT 10');
    });
  });

  describe('match_euid', () => {
    it('computes the entity store EUID per document and matches the frontier against it', () => {
      const frontier = ['user:john.doe@acmecrm.com@okta', 'user:jane@acmecrm.com@okta'];
      const { query, params } = buildHopQuery({
        hop: euidHop,
        target: { field: euidHop.target_fields[0].field },
        frontier,
        limit: 100,
      });
      const lines = query.split('\n');

      expect(params).toEqual(frontier);
      expect(lines[0]).toBe(HOP_QUERY_PREAMBLE);
      expect(lines[1]).toBe('FROM logs-entityanalytics_okta.user-*');
      // Documents that carry no user identity are excluded before anything is evaluated.
      expect(lines[2]).toMatch(/^\| WHERE .*user\.email.*user\.id.*user\.name.*`user\.entity/);
      // The EUID is computed with the store's rules and carries the type prefix.
      const evalAt = query.indexOf('__source = CONCAT("user:"');
      expect(evalAt).toBeGreaterThan(0);
      // The frontier is matched against the computed column, as parameters.
      const matchAt = query.indexOf('| WHERE __source IN (?, ?)');
      expect(matchAt).toBeGreaterThan(evalAt);
      expect(query).not.toContain('john.doe');
      // The computed column is the grouping key; no field alias is needed.
      expect(query).toContain(
        'BY __source, __target = `user.entity.relationships.can_assume.entity.id`'
      );
      expect(query.indexOf('| MV_EXPAND')).toBeGreaterThan(matchAt);
    });

    it('applies the scenario filter and lookback before the EUID evaluation', () => {
      const { query } = buildHopQuery({
        hop: { ...euidHop, filter: 'event.kind == "asset"', time_field: '@timestamp' },
        target: { field: euidHop.target_fields[0].field },
        frontier: ['user:a@b@okta'],
        limit: 100,
        lookback: '30m',
      });
      expect(query).toContain('| WHERE (event.kind == "asset")');
      expect(query).toContain('| WHERE `@timestamp` >= NOW() - 30 minutes');
      expect(query.indexOf('| WHERE (event.kind')).toBeLessThan(query.indexOf('| EVAL'));
    });

    it('uses entity.id unprefixed for generic entities', () => {
      const { query } = buildHopQuery({
        hop: { ...euidHop, match_euid: 'generic', index: 'assets-*' },
        target: { field: euidHop.target_fields[0].field },
        frontier: ['arn:aws:iam::1:role/a'],
        limit: 100,
      });
      const evalAt = query.indexOf('__source = ');
      const evaluation = query.slice(evalAt, query.indexOf('| WHERE __source IN'));
      expect(evaluation).toContain('entity.id');
      expect(evaluation).not.toContain('"generic:"');
    });
  });

  describe('exclusions', () => {
    it('filters documents on other fields, null-safe, with the values registered after the frontier', () => {
      const { query, params } = buildHopQuery({
        hop,
        target: { field: hop.target_fields[0].field },
        frontier: ['x'],
        limit: 10,
        exclusions: [{ field: 'cloud.account.id', values: ['111', '222'] }],
      });
      const filter =
        '| WHERE `cloud.account.id` IS NULL OR NOT (MV_CONTAINS(`cloud.account.id`, ?) OR MV_CONTAINS(`cloud.account.id`, ?))';
      expect(query).toContain(filter);
      expect(query.indexOf(filter)).toBeLessThan(query.indexOf('| MV_EXPAND'));
      expect(params).toEqual(['x', '111', '222']);
    });

    it('drops excluded values of the target field after expansion, not the whole document', () => {
      const targetField = hop.target_fields[0].field;
      const { query, params } = buildHopQuery({
        hop,
        target: { field: targetField },
        frontier: ['x'],
        limit: 10,
        exclusions: [{ field: targetField, values: ['arn:aws:iam::1:role/excluded'] }],
      });
      const filter = '| WHERE NOT `entity.relationships.can_assume.entity.id` IN (?)';
      expect(query).not.toContain('MV_CONTAINS');
      expect(query.indexOf(filter)).toBeGreaterThan(query.indexOf('| MV_EXPAND'));
      expect(query.indexOf(filter)).toBeLessThan(query.indexOf('| STATS'));
      expect(params).toEqual(['x', 'arn:aws:iam::1:role/excluded']);
    });

    it('registers document exclusions before the frontier on match_euid hops', () => {
      const { query, params } = buildHopQuery({
        hop: euidHop,
        target: { field: euidHop.target_fields[0].field },
        frontier: ['user:a@b@okta'],
        limit: 10,
        exclusions: [{ field: 'entity.id', values: ['arn:aws:iam::1:role/x'] }],
      });
      expect(params).toEqual(['arn:aws:iam::1:role/x', 'user:a@b@okta']);
      expect(query.indexOf('MV_CONTAINS(`entity.id`, ?)')).toBeLessThan(
        query.indexOf('| WHERE __source IN (?)')
      );
    });
  });

  it('refuses an empty frontier', () => {
    expect(() =>
      buildHopQuery({ hop, target: { field: hop.target_fields[0].field }, frontier: [], limit: 10 })
    ).toThrow('empty frontier');
  });

  it('refuses a hop with none of match_field, match_fields or match_euid', () => {
    expect(() =>
      buildHopQuery({
        hop: { ...hop, match_field: undefined },
        target: { field: hop.target_fields[0].field },
        frontier: ['x'],
        limit: 10,
      })
    ).toThrow('none of match_field, match_fields or match_euid');
  });

  describe('match_fields', () => {
    const HASH = 'a3f5c9d1e8b74620fa1c0d5e2b9847361c0ded4488ab2f0e9a7c6b5d4e3f2a10';
    const indicatorHop: TraversalHop = {
      hop_number: 2,
      name: 'indicators_to_hosts',
      index: 'logs-endpoint.events.*,logs-endpoint.alerts-*',
      match_fields: [
        { field: 'process.hash.sha256' },
        { field: 'file.hash.sha256' },
        { field: 'destination.ip', value_type: 'ip' },
      ],
      target_fields: [{ field: 'host.name', relation: 'observed_on' }],
      payload_fields: [],
    };

    it('ORs the fields, binds only address-shaped values to an ip field, and sources the edge from the matching field', () => {
      const { query, params } = buildHopQuery({
        hop: indicatorHop,
        target: { field: 'host.name' },
        frontier: [HASH, '185.220.101.42'],
        limit: 100,
      });
      expect(query).toBe(
        [
          HOP_QUERY_PREAMBLE,
          'FROM logs-endpoint.events.*,logs-endpoint.alerts-*',
          '| WHERE (`process.hash.sha256` IN (?, ?) OR `file.hash.sha256` IN (?, ?) OR `destination.ip` IN (?)) AND `host.name` IS NOT NULL',
          '| MV_EXPAND `host.name`',
          '| STATS __count = COUNT(*) BY __source = CASE(`process.hash.sha256` IN (?, ?), TO_STRING(`process.hash.sha256`), `file.hash.sha256` IN (?, ?), TO_STRING(`file.hash.sha256`), TO_STRING(`destination.ip`)), __target = `host.name`',
          '| LIMIT 100',
        ].join('\n')
      );
      // The WHERE binds the frontier per field, then the CASE arms bind it again in order.
      expect(params).toEqual([
        HASH,
        '185.220.101.42',
        HASH,
        '185.220.101.42',
        '185.220.101.42',
        HASH,
        '185.220.101.42',
        HASH,
        '185.220.101.42',
      ]);
    });

    it('leaves out a typed field none of the frontier fits and a single remaining field needs no CASE', () => {
      const { query, params } = buildHopQuery({
        hop: {
          ...indicatorHop,
          match_fields: [
            { field: 'destination.ip', value_type: 'ip' },
            { field: 'process.hash.sha256' },
          ],
        },
        target: { field: 'host.name' },
        frontier: [HASH],
        limit: 100,
      });
      expect(query).toContain('| WHERE (`process.hash.sha256` IN (?)) AND');
      expect(query).toContain('BY __source = TO_STRING(`process.hash.sha256`), __target');
      expect(query).not.toContain('destination.ip');
      expect(params).toEqual([HASH]);
    });

    it('refuses a frontier none of the fields can bind', () => {
      expect(() =>
        buildHopQuery({
          hop: { ...indicatorHop, match_fields: [{ field: 'destination.ip', value_type: 'ip' }] },
          target: { field: 'host.name' },
          frontier: [HASH],
          limit: 100,
        })
      ).toThrow('no frontier value can be bound');
    });

    it('treats IPv4 and IPv6 as addresses and hashes or names as not', () => {
      const match = { field: 'destination.ip', value_type: 'ip' as const };
      expect(frontierForMatchField(match, ['10.0.0.10', '2001:db8::1', HASH, 'host:a'])).toEqual([
        '10.0.0.10',
        '2001:db8::1',
      ]);
      expect(frontierForMatchField({ field: 'x' }, [HASH, 'host:a'])).toEqual([HASH, 'host:a']);
    });
  });

  describe('target euid', () => {
    const hostHop: TraversalHop = {
      hop_number: 2,
      name: 'indicators_to_hosts',
      index: 'logs-endpoint.events.*',
      match_field: 'process.hash.sha256',
      target_fields: [],
      target_euid: { type: 'host', relation: 'observed_on' },
      payload_fields: ['process.name'],
    };

    it('requires a host identity, computes the host EUID as the target and groups by it', () => {
      const { query, params } = buildHopQuery({
        hop: hostHop,
        target: { euid: 'host' },
        frontier: ['h1'],
        limit: 50,
      });
      expect(params).toEqual(['h1']);
      const lines = query.split('\n');
      expect(lines[2]).toMatch(
        /^\| WHERE `process\.hash\.sha256` IN \(\?\) AND \(.*host\.name.*\)$/
      );
      expect(query).toContain('| EVAL ');
      expect(query).toContain('__target = ');
      expect(query).toContain('| WHERE __target IS NOT NULL');
      expect(query).toContain('| MV_EXPAND __target');
      expect(query).toMatch(/BY __source = `process\.hash\.sha256`, __target\n\| LIMIT 50$/);
      expect(query).not.toContain('__target = __target');
    });

    it('never treats an exclusion as a target exclusion when the target is an EUID', () => {
      const { query, params } = buildHopQuery({
        hop: hostHop,
        target: { euid: 'host' },
        frontier: ['h1'],
        limit: 50,
        exclusions: [{ field: 'entity.id', values: ['host:SRV-DC01'] }],
      });
      expect(query).toContain('| WHERE `entity.id` IS NULL OR NOT (MV_CONTAINS(`entity.id`, ?))');
      expect(params).toEqual(['h1', 'host:SRV-DC01']);
    });
  });
});

describe('lookbackToEsqlSpan', () => {
  it('converts m/h/d suffixes to ES|QL time spans', () => {
    expect(lookbackToEsqlSpan('30m')).toBe('30 minutes');
    expect(lookbackToEsqlSpan('24h')).toBe('24 hours');
    expect(lookbackToEsqlSpan('7d')).toBe('7 days');
  });

  it('rejects anything else', () => {
    expect(() => lookbackToEsqlSpan('7 days')).toThrow();
    expect(() => lookbackToEsqlSpan('1w')).toThrow();
  });
});
