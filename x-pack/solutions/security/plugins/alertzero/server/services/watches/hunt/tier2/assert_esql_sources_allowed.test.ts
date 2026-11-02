/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertEsqlSourcesAllowed } from './assert_esql_sources_allowed';

const allowed = ['logs-aws.*'];

describe('assertEsqlSourcesAllowed', () => {
  it('returns ok for a FROM source covered by the allowlist', () => {
    expect(
      assertEsqlSourcesAllowed(
        'FROM logs-aws.cloudtrail-* | WHERE event.action == "AssumeRole"',
        allowed
      )
    ).toEqual({ ok: true });
  });

  it('returns ok when the source is exactly an allowlist pattern', () => {
    expect(assertEsqlSourcesAllowed('FROM logs-aws.* | LIMIT 1', allowed)).toEqual({ ok: true });
  });

  it('returns not ok for FROM *', () => {
    expect(assertEsqlSourcesAllowed('FROM * | LIMIT 1', allowed)).toEqual({
      ok: false,
      reason: expect.stringContaining('FROM source "*"'),
    });
  });

  it('returns not ok for a source outside the allowlist', () => {
    expect(assertEsqlSourcesAllowed('FROM .kibana-* | LIMIT 1', allowed)).toEqual({
      ok: false,
      reason: expect.stringContaining('.kibana-*'),
    });
  });

  it('returns not ok when any source in a multi-source FROM is outside scope', () => {
    expect(assertEsqlSourcesAllowed('FROM logs-aws.*, .kibana-* | LIMIT 1', allowed)).toEqual({
      ok: false,
      reason: expect.stringContaining('.kibana-*'),
    });
  });

  it('returns not ok for a broader pattern than the allowlist', () => {
    expect(assertEsqlSourcesAllowed('FROM logs-* | LIMIT 1', allowed)).toEqual({
      ok: false,
      reason: expect.stringContaining('logs-*'),
    });
  });

  it('returns ok for cross-cluster sources the allowlist names, quoted or not', () => {
    const ccs = ['infosec_zocalo:logs-aws.cloudtrail*', 'infosec_redsector:logs-endpoint.events.*'];
    expect(
      assertEsqlSourcesAllowed(
        'FROM infosec_zocalo:logs-aws.cloudtrail-default*, infosec_redsector:logs-endpoint.events.process-* | LIMIT 1',
        ccs
      )
    ).toEqual({ ok: true });
    expect(
      assertEsqlSourcesAllowed('FROM "infosec_zocalo:logs-aws.cloudtrail-default*" | LIMIT 1', ccs)
    ).toEqual({ ok: true });
  });

  it('returns ok for a concrete cluster under a wildcard-cluster allowlist', () => {
    expect(
      assertEsqlSourcesAllowed('FROM infosec_zocalo:logs-aws.cloudtrail-* | LIMIT 1', ['*:logs-*'])
    ).toEqual({ ok: true });
    expect(
      assertEsqlSourcesAllowed('FROM other:logs-aws.cloudtrail-* | LIMIT 1', ['infosec_*:logs-*'])
    ).toEqual({ ok: false, reason: expect.stringContaining('other:logs-aws.cloudtrail-*') });
  });

  it('returns not ok for a cluster or selector the allowlist does not name', () => {
    const ccs = ['infosec_zocalo:logs-aws.cloudtrail*'];
    expect(assertEsqlSourcesAllowed('FROM other:logs-aws.cloudtrail-* | LIMIT 1', ccs)).toEqual({
      ok: false,
      reason: expect.stringContaining('other:logs-aws.cloudtrail-*'),
    });
    expect(assertEsqlSourcesAllowed('FROM *:logs-aws.cloudtrail-* | LIMIT 1', ccs)).toEqual({
      ok: false,
      reason: expect.stringContaining('*:logs-aws.cloudtrail-*'),
    });
    expect(
      assertEsqlSourcesAllowed('FROM infosec_zocalo:logs-aws.cloudtrail-*::failures | LIMIT 1', ccs)
    ).toEqual({ ok: false, reason: expect.stringContaining('::failures') });
  });

  it('returns not ok when the allowlist is empty', () => {
    expect(assertEsqlSourcesAllowed('FROM logs-aws.* | LIMIT 1', [])).toEqual({
      ok: false,
      reason: 'no allowed index patterns',
    });
  });

  it('returns not ok when the query does not start with FROM', () => {
    expect(assertEsqlSourcesAllowed('ROW a = 1', allowed)).toEqual({
      ok: false,
      reason: 'query must start with a valid FROM',
    });
  });

  describe('commands other than FROM that read an index', () => {
    it('returns not ok for a LOOKUP JOIN outside the allowlist, despite an allowed FROM', () => {
      expect(
        assertEsqlSourcesAllowed(
          'FROM logs-aws.* | LOOKUP JOIN .kibana-secrets ON host.name | LIMIT 1',
          allowed
        )
      ).toEqual({
        ok: false,
        reason: expect.stringContaining('.kibana-secrets'),
      });
    });

    it('returns not ok for an ENRICH policy, which resolves to an index this hunt never allowed', () => {
      expect(
        assertEsqlSourcesAllowed('FROM logs-aws.* | ENRICH some_policy ON host.name', allowed)
      ).toEqual({
        ok: false,
        reason: expect.stringContaining('some_policy'),
      });
    });

    it('returns not ok for an ENRICH policy even when its name matches the allowlist', () => {
      expect(
        assertEsqlSourcesAllowed('FROM logs-aws.x | ENRICH logs-policy ON host.name', ['logs-*'])
      ).toEqual({ ok: false, reason: expect.stringContaining('ENRICH policy "logs-policy"') });
    });

    it('returns not ok for an ENRICH nested in a FORK branch', () => {
      expect(
        assertEsqlSourcesAllowed(
          'FROM logs-aws.x | FORK (WHERE a == 1) (ENRICH logs-policy ON host.name)',
          ['logs-*']
        )
      ).toEqual({ ok: false, reason: expect.stringContaining('ENRICH policy "logs-policy"') });
    });

    it.each([
      'FROM remote:logs-events | LOOKUP JOIN _coordinator:logs-lookup ON id',
      'FROM remote:logs-events | ENRICH _any:logs-policy ON host.name',
      'FROM remote:logs-events | ENRICH _remote:logs-policy ON host.name',
      'FROM remote:logs-events | ENRICH _coordinator:logs-policy ON host.name',
      'FROM _coordinator:logs-events | LIMIT 1',
    ])('returns not ok for an ES|QL mode prefix under a wildcard-cluster scope: %s', (query) => {
      expect(assertEsqlSourcesAllowed(query, ['*:logs-*'])).toEqual({
        ok: false,
        reason: expect.any(String),
      });
    });

    it('names the command that reached out of scope, not just the source', () => {
      const result = assertEsqlSourcesAllowed(
        'FROM logs-aws.* | LOOKUP JOIN evil ON host.name',
        allowed
      );

      expect(result).toEqual({ ok: false, reason: expect.stringContaining('JOIN source "evil"') });
    });

    it('returns ok for a LOOKUP JOIN that stays inside the allowlist', () => {
      expect(
        assertEsqlSourcesAllowed(
          'FROM logs-aws.* | LOOKUP JOIN logs-aws.inventory ON host.name | LIMIT 1',
          allowed
        )
      ).toEqual({ ok: true });
    });
  });
});
