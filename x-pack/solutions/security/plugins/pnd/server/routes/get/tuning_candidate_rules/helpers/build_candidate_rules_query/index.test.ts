/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_TUNING_CANDIDATE_RULES_MAX } from '@kbn/pnd-common';

import { PND_CANDIDATE_RULES_AGG_NAME, buildCandidateRulesQuery } from '.';

describe('buildCandidateRulesQuery', () => {
  const defaultParams = { alertIds: ['alert-1', 'alert-2'], spaceId: 'agent-3' };

  it('queries the space-scoped alerts index', () => {
    expect(buildCandidateRulesQuery(defaultParams).index).toBe('.alerts-security.alerts-agent-3');
  });

  // S9: the space arrives from the request, so a `'*'` here would be a cross-space read.
  it('never widens the index to every space', () => {
    expect(buildCandidateRulesQuery(defaultParams).index).not.toContain('*');
  });

  it('filters to the discovery’s constituent alerts', () => {
    expect(buildCandidateRulesQuery(defaultParams).query).toEqual({
      ids: { values: ['alert-1', 'alert-2'] },
    });
  });

  /**
   * `kibana.alert.rule.uuid` is the rule's **saved-object** id, which is what `_apply` patches;
   * `kibana.alert.rule.rule_id` is the human-authored one and 404s there (measured, bead
   * `kibana-0fph`). Aggregating on the wrong one would produce a menu that cannot be applied.
   */
  it('aggregates on the rule’s saved-object id', () => {
    const { aggs } = buildCandidateRulesQuery(defaultParams);

    expect(aggs?.[PND_CANDIDATE_RULES_AGG_NAME]).toEqual({
      terms: { field: 'kibana.alert.rule.uuid', size: PND_TUNING_CANDIDATE_RULES_MAX },
    });
  });

  it('does not aggregate on the human-authored rule_id', () => {
    expect(JSON.stringify(buildCandidateRulesQuery(defaultParams))).not.toContain(
      'kibana.alert.rule.rule_id'
    );
  });

  // The `terms` size is the fan-out bound: each bucket costs one scoped rules-API read.
  it('bounds the buckets at the shared candidate cap', () => {
    const { aggs } = buildCandidateRulesQuery(defaultParams);

    expect(aggs?.[PND_CANDIDATE_RULES_AGG_NAME]?.terms?.size).toBe(PND_TUNING_CANDIDATE_RULES_MAX);
  });

  it('requests no hits, because only the buckets are read', () => {
    expect(buildCandidateRulesQuery(defaultParams).size).toBe(0);
  });

  it('does not track total hits, which nothing reads', () => {
    expect(buildCandidateRulesQuery(defaultParams).track_total_hits).toBe(false);
  });

  // A space where no detection rule has ever fired has no alerts index; an empty menu is the honest
  // answer there rather than an index_not_found_exception.
  it('tolerates a space with no alerts index', () => {
    expect(buildCandidateRulesQuery(defaultParams).ignore_unavailable).toBe(true);
  });

  it('builds a query for a single alert', () => {
    expect(buildCandidateRulesQuery({ alertIds: ['alert-1'], spaceId: 'default' }).query).toEqual({
      ids: { values: ['alert-1'] },
    });
  });

  // Guards against a readonly array leaking into the request body by reference.
  it('copies the alert ids rather than aliasing the caller’s array', () => {
    const alertIds = ['alert-1'];

    const { query } = buildCandidateRulesQuery({ alertIds, spaceId: 'default' });

    expect(query?.ids?.values).not.toBe(alertIds);
  });
});
