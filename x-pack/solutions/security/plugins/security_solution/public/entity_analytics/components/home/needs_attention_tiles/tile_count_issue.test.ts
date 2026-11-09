/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCountIssue } from './tile_count_issue';

const none = { timedOut: false, hasError: false };

describe('getCountIssue', () => {
  it('has no issue when the count could be read', () => {
    expect(getCountIssue(none)).toBeUndefined();
  });

  it.each([
    ['alerts', 'Requires read access to alerts'],
    ['anomalies', 'Requires read access to ML anomalies'],
    ['risk', 'Requires read access to risk scores'],
  ] as const)('says which access is missing for %s', (noAccess, text) => {
    expect(getCountIssue({ ...none, noAccess })).toEqual({ kind: 'locked', text });
  });

  it('reports a timeout as an error that names the limit', () => {
    expect(getCountIssue({ ...none, timedOut: true })).toEqual(
      expect.objectContaining({
        kind: 'issue',
        icon: 'error',
        text: 'Query timed out',
        tooltip: expect.stringContaining('more than 90 seconds'),
      })
    );
  });

  it.each([
    ['alertsIndex', 'Requires an alerts index'],
    ['anomalyJobs', 'Requires anomaly detection jobs'],
    ['riskData', 'Requires risk score history data'],
  ] as const)('reports a missing %s as a warning', (missing, text) => {
    expect(getCountIssue({ ...none, missing })).toEqual(
      expect.objectContaining({ kind: 'issue', icon: 'warning', text })
    );
  });

  it('reports a failed query as an error', () => {
    expect(getCountIssue({ ...none, hasError: true })).toEqual(
      expect.objectContaining({ kind: 'issue', icon: 'error', text: "Couldn't load data" })
    );
  });

  it('puts missing access first, then a timeout, then a missing prerequisite, then a failure', () => {
    const all = { noAccess: 'alerts', timedOut: true, missing: 'alertsIndex', hasError: true };
    expect(getCountIssue(all as Parameters<typeof getCountIssue>[0])?.kind).toBe('locked');
    expect(getCountIssue({ ...all, noAccess: undefined } as never)).toEqual(
      expect.objectContaining({ text: 'Query timed out' })
    );
    expect(getCountIssue({ ...all, noAccess: undefined, timedOut: false } as never)).toEqual(
      expect.objectContaining({ text: 'Requires an alerts index' })
    );
    expect(
      getCountIssue({ ...all, noAccess: undefined, timedOut: false, missing: undefined } as never)
    ).toEqual(expect.objectContaining({ text: "Couldn't load data" }));
  });
});
