/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { strictKeyTag } from '../../../alert_triage/fp_decisions';
import { findDecisionsWithConflictingVerdicts } from './decisions_with_verdicts';

const HASH_A = '0000000000000001';
const HASH_B = '0000000000000002';
const A = `fp-decision-${HASH_A}`;
const B = `fp-decision-${HASH_B}`;

const apiWith = (keysWithVerdicts: string[]) => ({
  callKibanaApi: jest.fn().mockResolvedValue({
    status: 200,
    headers: {},
    body: { aggregations: { keys: { buckets: keysWithVerdicts.map((key) => ({ key })) } } },
  }),
});

describe('findDecisionsWithConflictingVerdicts', () => {
  it('returns the decisions whose key an alert carries with a verdict, and no others', async () => {
    const api = apiWith([strictKeyTag(HASH_B)]);

    await expect(findDecisionsWithConflictingVerdicts(api, [A, B])).resolves.toEqual(new Set([B]));
  });

  it('searches once for all the decisions, with the strict key tag of each and the blocking verdicts', async () => {
    const api = apiWith([]);

    await findDecisionsWithConflictingVerdicts(api, [A, B]);

    expect(api.callKibanaApi).toHaveBeenCalledTimes(1);
    const { query } = api.callKibanaApi.mock.calls[0][0].body;
    expect(query.bool.filter[0].terms['kibana.alert.workflow_tags']).toEqual([
      strictKeyTag(HASH_A),
      strictKeyTag(HASH_B),
    ]);
    expect(query.bool.filter[1].terms['kibana.alert.workflow_tags']).toEqual([
      'az:true_positive',
      'az:inconclusive',
    ]);
  });

  it('fails instead of reporting no conflict when the search fails', async () => {
    const api = { callKibanaApi: jest.fn().mockRejectedValue(new Error('es down')) };

    await expect(findDecisionsWithConflictingVerdicts(api, [A])).rejects.toThrow('es down');
  });

  it('searches in chunks of 500 decisions', async () => {
    const api = apiWith([]);
    const ids = Array.from(
      { length: 501 },
      (_unused, i) => `fp-decision-${i.toString(16).padStart(16, '0')}`
    );

    await findDecisionsWithConflictingVerdicts(api, ids);

    expect(api.callKibanaApi).toHaveBeenCalledTimes(2);
  });

  it('stops before the next search once told to, and leaves the decisions it did not read out', async () => {
    const api = apiWith([]);
    const ids = Array.from(
      { length: 1001 },
      (_unused, i) => `fp-decision-${i.toString(16).padStart(16, '0')}`
    );
    const shouldStop = jest.fn().mockReturnValueOnce(false).mockReturnValue(true);

    await findDecisionsWithConflictingVerdicts(api, ids, shouldStop);

    expect(api.callKibanaApi).toHaveBeenCalledTimes(1);
  });

  it('does not search at all when it is told to stop at once', async () => {
    const api = apiWith([]);

    await findDecisionsWithConflictingVerdicts(api, [A], () => true);

    expect(api.callKibanaApi).not.toHaveBeenCalled();
  });
});
