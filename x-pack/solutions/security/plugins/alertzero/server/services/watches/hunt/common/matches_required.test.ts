/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildMatchesRequired, isIndexPatternAllowed } from './matches_required';

describe('buildMatchesRequired', () => {
  const matchesRequired = buildMatchesRequired(['logs-aws.*', 'logs-fortinet.*']);

  it('returns true for a concrete index matching a required pattern', () => {
    expect(matchesRequired('logs-aws.cloudtrail-default')).toBe(true);
  });

  it('returns true after stripping the data-stream backing prefix', () => {
    expect(matchesRequired('.ds-logs-aws.cloudtrail-default-2026.09.01-000001')).toBe(true);
  });

  it('returns false for an optional alerts index', () => {
    expect(matchesRequired('.alerts-security.alerts-default')).toBe(false);
  });
});

describe('isIndexPatternAllowed', () => {
  const allowlist = ['logs-aws.*'];

  it('returns true for a more-specific pattern under the allowlist', () => {
    expect(isIndexPatternAllowed('logs-aws.cloudtrail-*', allowlist)).toBe(true);
  });

  it('returns true when the candidate equals an allowlist entry', () => {
    expect(isIndexPatternAllowed('logs-aws.*', allowlist)).toBe(true);
  });

  it('returns false for FROM *', () => {
    expect(isIndexPatternAllowed('*', allowlist)).toBe(false);
  });

  it('returns false for a broader pattern than the allowlist', () => {
    expect(isIndexPatternAllowed('logs-*', allowlist)).toBe(false);
  });

  it('returns false for an unrelated pattern', () => {
    expect(isIndexPatternAllowed('.kibana*', allowlist)).toBe(false);
  });

  it('returns false for a cross-cluster source', () => {
    expect(isIndexPatternAllowed('remote:logs-aws.*', allowlist)).toBe(false);
  });

  it('returns false for a selector', () => {
    expect(isIndexPatternAllowed('logs-aws.*::failures', allowlist)).toBe(false);
  });
});

describe('cross-cluster names', () => {
  const ccs = ['infosec_zocalo:logs-aws.cloudtrail*', 'infosec_redsector:logs-endpoint.events.*'];

  it('matches a remote backing index against its own cluster pattern', () => {
    const matchesRequired = buildMatchesRequired(ccs);
    expect(
      matchesRequired('infosec_zocalo:.ds-logs-aws.cloudtrail-default-2026.10.26-000001')
    ).toBe(true);
    expect(matchesRequired('infosec_zocalo:logs-aws.cloudtrail-default')).toBe(true);
  });

  it('never matches a remote name against another cluster or a local pattern', () => {
    expect(
      buildMatchesRequired(ccs)('infosec_redsector:.ds-logs-aws.cloudtrail-default-2026.10.26-1')
    ).toBe(false);
    expect(
      buildMatchesRequired(['*elastic-cloud-logs-*'])('remote:elastic-cloud-logs-default')
    ).toBe(false);
    expect(buildMatchesRequired(['logs-*'])('remote:.ds-logs-aws-default-2026.10.26-1')).toBe(
      false
    );
  });

  it('globs a wildcard cluster alias the way Elasticsearch expands it', () => {
    expect(buildMatchesRequired(['infosec_*:logs-*'])('infosec_zocalo:logs-aws-default')).toBe(
      true
    );
  });

  it('allows a Tier 2 source on a cluster the scope names', () => {
    expect(isIndexPatternAllowed('infosec_zocalo:logs-aws.cloudtrail-default*', ccs)).toBe(true);
    expect(isIndexPatternAllowed('infosec_zocalo:logs-aws.cloudtrail*', ccs)).toBe(true);
    expect(
      isIndexPatternAllowed('infosec_zocalo:.ds-logs-aws.cloudtrail-default-2026.10.26-000001', ccs)
    ).toBe(true);
  });

  it('refuses a cluster the scope does not name, and a local source the scope only names remotely', () => {
    expect(isIndexPatternAllowed('other:logs-aws.cloudtrail-default*', ccs)).toBe(false);
    expect(isIndexPatternAllowed('infosec_redsector:logs-aws.cloudtrail*', ccs)).toBe(false);
    expect(isIndexPatternAllowed('logs-aws.cloudtrail-default*', ccs)).toBe(false);
    expect(isIndexPatternAllowed('remote:logs-aws.cloudtrail-*', ['*'])).toBe(false);
  });

  it('globs a concrete cluster against a wildcard-cluster scope', () => {
    expect(isIndexPatternAllowed('infosec_zocalo:logs-aws.cloudtrail-x*', ['*:logs-*'])).toBe(true);
    expect(
      isIndexPatternAllowed('infosec_zocalo:logs-aws.cloudtrail-x*', ['infosec_*:logs-*'])
    ).toBe(true);
    expect(isIndexPatternAllowed('other:logs-x*', ['infosec_*:logs-*'])).toBe(false);
    expect(
      isIndexPatternAllowed('infosec_zocalo:logs-elastic_agent.x*', [
        '*:logs-*',
        '*:-logs-elastic_agent*',
      ])
    ).toBe(false);
  });

  it('only lets a wildcard cluster through when the scope names that exact cluster string', () => {
    expect(isIndexPatternAllowed('*:logs-aws.cloudtrail*', ccs)).toBe(false);
    expect(isIndexPatternAllowed('infosec_*:logs-aws.cloudtrail*', ccs)).toBe(false);
    expect(isIndexPatternAllowed('*:logs-aws.*', ['infosec_zocalo:logs-*'])).toBe(false);
    expect(isIndexPatternAllowed('infosec_*:logs-aws.*', ['infosec_zocalo:logs-*'])).toBe(false);
    expect(isIndexPatternAllowed('infosec_*:logs-aws.*', ['*:logs-*'])).toBe(false);
    expect(isIndexPatternAllowed('*:logs-aws.*', ['*:logs-*'])).toBe(true);
  });

  it('refuses a whole remote cluster and a remote selector', () => {
    expect(isIndexPatternAllowed('infosec_zocalo:*', ['infosec_zocalo:*'])).toBe(false);
    expect(isIndexPatternAllowed('infosec_zocalo:logs-aws.cloudtrail*::failures', ccs)).toBe(false);
  });

  it.each([
    ['the remote index form', 'remote:-logs-elastic_agent*'],
    ['the 9.5+ leading-minus form', '-remote:logs-elastic_agent*'],
  ])('applies a remote index exclusion written in %s', (_label, exclusion) => {
    const scope = ['remote:logs-*', exclusion, '-logs-fleet_server*'];
    expect(isIndexPatternAllowed('remote:logs-okta.system-*', scope)).toBe(true);
    expect(isIndexPatternAllowed('remote:logs-elastic_agent.filebeat-default*', scope)).toBe(false);
    // A local exclusion does not reach a remote cluster, same as in the search itself.
    expect(isIndexPatternAllowed('remote:logs-fleet_server.output-default*', scope)).toBe(true);
    // Nor is a remote exclusion a source, or does it leak onto the local cluster.
    expect(isIndexPatternAllowed(exclusion, scope)).toBe(false);
    expect(isIndexPatternAllowed('logs-elastic_agent*', ['logs-*', exclusion])).toBe(true);

    const matchesRequired = buildMatchesRequired(scope);
    expect(matchesRequired('remote:.ds-logs-okta.system-default-2026.10.26-000001')).toBe(true);
    expect(
      matchesRequired('remote:.ds-logs-elastic_agent.filebeat-default-2026.10.26-000001')
    ).toBe(false);
  });

  it('applies a remote exclusion to every cluster its alias glob could reach', () => {
    expect(
      isIndexPatternAllowed('remote:logs-elastic_agent.filebeat-default*', [
        'remote:logs-*',
        '*:-logs-elastic_agent*',
      ])
    ).toBe(false);
  });

  it('refuses everything on a cluster a whole-cluster exclusion removes', () => {
    const scope = ['*:logs-*', 'remote:logs-*', 'other:logs-*', '-remote:*'];
    expect(isIndexPatternAllowed('remote:logs-okta.system-*', scope)).toBe(false);
    expect(isIndexPatternAllowed('other:logs-okta.system-*', scope)).toBe(true);
    expect(buildMatchesRequired(scope)('remote:logs-okta.system-default')).toBe(false);
    expect(buildMatchesRequired(scope)('other:logs-okta.system-default')).toBe(true);
  });
});

describe('exclusion entries', () => {
  const broad = ['logs-*', '-logs-elastic_agent*', '-logs-fleet_server*'];

  it('keeps an excluded stream out of the required set even though the positive pattern covers it', () => {
    const matchesRequired = buildMatchesRequired(broad);
    expect(matchesRequired('.ds-logs-okta.system-default-2026.09.01-000001')).toBe(true);
    expect(matchesRequired('.ds-logs-elastic_agent.filebeat-default-2026.09.01-000001')).toBe(
      false
    );
    expect(matchesRequired('.ds-logs-fleet_server.output-default-2026.09.01-000001')).toBe(false);
  });

  it('refuses a Tier 2 source that the scope excludes, so the ES|QL gate matches the Tier 1 search', () => {
    expect(isIndexPatternAllowed('logs-okta.system-*', broad)).toBe(true);
    expect(isIndexPatternAllowed('logs-elastic_agent*', broad)).toBe(false);
    expect(isIndexPatternAllowed('logs-elastic_agent.filebeat-default*', broad)).toBe(false);
    expect(isIndexPatternAllowed('logs-fleet_server*', broad)).toBe(false);
  });

  it('refuses a wildcard whose expansion could reach an excluded stream, not just the exact name', () => {
    // Elasticsearch expands `logs-e*` to `logs-elastic_agent-default` too; probing one
    // instance (`logs-ex`) would have let it through.
    expect(isIndexPatternAllowed('logs-e*', broad)).toBe(false);
    expect(isIndexPatternAllowed('logs-elastic*', broad)).toBe(false);
    expect(isIndexPatternAllowed('logs-f*', broad)).toBe(false);
    // Disjoint prefixes stay allowed.
    expect(isIndexPatternAllowed('logs-okta*', broad)).toBe(true);
    expect(isIndexPatternAllowed('logs-o*', broad)).toBe(true);
  });

  it('treats the broad positive itself as a source that overlaps its exclusions, so it is refused', () => {
    expect(isIndexPatternAllowed('logs-*', broad)).toBe(false);
  });

  it('judges a concrete candidate exactly, so a name that merely shares a prefix with an exclusion is allowed', () => {
    expect(isIndexPatternAllowed('logs-elastic', broad)).toBe(true);
    expect(isIndexPatternAllowed('logs-elastic_agent.filebeat-default', broad)).toBe(false);
  });

  it('refuses an explicitly named backing index of an excluded stream, normalizing .ds- the same way the positive check does', () => {
    expect(
      isIndexPatternAllowed('.ds-logs-elastic_agent.filebeat-default-2026.09.01-000001', broad)
    ).toBe(false);
    expect(isIndexPatternAllowed('.ds-logs-elastic_agent*', broad)).toBe(false);
    // An allowed stream's backing index is still fine.
    expect(isIndexPatternAllowed('.ds-logs-okta.system-default-2026.09.01-000001', broad)).toBe(
      true
    );
  });

  it('never accepts an exclusion entry itself as a source', () => {
    expect(isIndexPatternAllowed('-logs-elastic_agent*', broad)).toBe(false);
  });
});
