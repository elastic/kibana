/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntIncompleteness, HuntIncompleteReason } from '@kbn/alertzero-common';
import { completedSuccessfully, huntCompletenessOf } from './completeness';

const gap = (reason: HuntIncompleteReason): HuntIncompleteness => ({ reason, detail: 'because' });

describe('huntCompletenessOf', () => {
  it('reports a run with no gaps as complete', () => {
    expect(huntCompletenessOf([])).toBe('complete');
  });

  it.each<HuntIncompleteReason>([
    'search_partial',
    'index_unavailable',
    'generation_failed',
    'execute_failed',
  ])('treats %s as retryable, so the report stays eligible', (reason) => {
    expect(huntCompletenessOf([gap(reason)])).toBe('incomplete_retryable');
    expect(completedSuccessfully(huntCompletenessOf([gap(reason)]))).toBe(false);
  });

  it.each<HuntIncompleteReason>(['query_out_of_scope', 'query_ungrounded', 'quote_ungrounded'])(
    'treats %s as retryable, because the model may answer differently next run',
    (reason) => {
      // The gate that refused the output is deterministic; the output is not. Retiring the
      // report here would record a technique as hunted that was never searched for.
      expect(huntCompletenessOf([gap(reason)])).toBe('incomplete_retryable');
      expect(completedSuccessfully(huntCompletenessOf([gap(reason)]))).toBe(false);
    }
  );

  it.each<HuntIncompleteReason>([
    'generation_budget',
    'unknown_technique_id',
    'rows_unclassifiable',
    'refs_unavailable',
    'nothing_searched',
    'input_truncated',
  ])('treats %s as final, so the report is retired rather than re-swept', (reason) => {
    expect(huntCompletenessOf([gap(reason)])).toBe('incomplete_final');
    // Retired, because re-running reproduces the same gap and re-spends the run.
    expect(completedSuccessfully(huntCompletenessOf([gap(reason)]))).toBe(true);
  });

  it('lets a retryable gap win over a deterministic one', () => {
    // Retrying still gains something: the next run closes the transient half and
    // reports the rest as final, so the report settles instead of cycling forever.
    expect(huntCompletenessOf([gap('generation_budget'), gap('execute_failed')])).toBe(
      'incomplete_retryable'
    );
  });

  it('keeps a deterministic gap out of `completed_successfully` but not out of completeness', () => {
    // The whole point of the split: the report is retired, and the run still has to
    // say it never searched, so nothing downstream records a clean environment.
    const completeness = huntCompletenessOf([gap('nothing_searched')]);
    expect(completedSuccessfully(completeness)).toBe(true);
    expect(completeness).not.toBe('complete');
  });
});
