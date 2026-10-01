/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertIdsOf, buildFpCloseComment, unionAlertIds } from './fp_close_proposal';

describe('fp_close_proposal helpers', () => {
  it('reads only string alert ids from an action input', () => {
    expect(alertIdsOf({ alertIds: ['a', 7, 'b'] })).toEqual(['a', 'b']);
    expect(alertIdsOf({ alertIds: 'a' })).toEqual([]);
    expect(alertIdsOf(undefined)).toEqual([]);
  });

  it('keeps the existing order and adds each new id once', () => {
    expect(unionAlertIds(['a', 'b'], ['b', 'c', 'c'])).toEqual(['a', 'b', 'c']);
  });

  // The review raises the proposal with the same wording (create_fp_proposal in
  // floor_alert_triage_review.yaml), so a revised card reads like the original.
  it.each([
    [1, '1 alert from rule "Noisy rule" was classified'],
    [4, '4 alerts from rule "Noisy rule" were classified'],
  ])('describes %i alert(s) the way the review does', (alertCount, expected) => {
    const comment = buildFpCloseComment({
      alertCount,
      ruleName: 'Noisy rule',
      confidenceFloor: 0.85,
    });
    expect(comment).toContain(expected);
    expect(comment).toContain('at or above the configured confidence floor (0.85).');
    expect(comment).toContain('Later runs of the rule add their false positives to this proposal.');
    expect(comment).toContain('will close them with workflow_reason=false_positive.');
  });
});
