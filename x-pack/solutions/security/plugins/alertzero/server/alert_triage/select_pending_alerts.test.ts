/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectPendingAlerts } from './select_pending_alerts';
import { HOUR_MS, NOW, makeAlert } from './test_helpers';

const select = (alerts: ReturnType<typeof makeAlert>[]) =>
  selectPendingAlerts({ alerts, now: NOW, lookbackHours: 24, analysisTagPrefix: 'ai-triage' });

describe('selectPendingAlerts', () => {
  it('selects open and acknowledged alerts inside the look-back', () => {
    const open = makeAlert();
    const acknowledged = makeAlert({ status: 'acknowledged' });

    expect(select([open, acknowledged]).pending).toEqual([open, acknowledged]);
  });

  it('ignores closed alerts, so a human decision is never overridden', () => {
    expect(select([makeAlert({ status: 'closed' })])).toEqual({
      pending: [],
      stale: [],
      claimed: [],
    });
  });

  it.each([
    'az:true_positive',
    'az:false_positive',
    'az:inconclusive',
    'az:triage_failed',
    'ai-triage.version.1',
  ])('skips an alert that already carries %s', (tag) => {
    expect(select([makeAlert({ tags: [tag] })])).toEqual({ pending: [], stale: [], claimed: [] });
  });

  it('returns alerts older than the look-back as stale instead of dropping them', () => {
    const old = makeAlert({ timestamp: NOW - 25 * HOUR_MS });

    expect(select([old])).toEqual({ pending: [], stale: [old], claimed: [] });
  });

  it('does not return an alert that is already tagged stale again', () => {
    const old = makeAlert({ timestamp: NOW - 25 * HOUR_MS, tags: ['az:triage_stale'] });

    expect(select([old]).stale).toEqual([]);
  });

  it('returns claimed alerts separately whatever their age', () => {
    const claimed = makeAlert({ timestamp: NOW - 30 * HOUR_MS, tags: ['az:triage_pending'] });

    expect(select([claimed])).toEqual({ pending: [], stale: [], claimed: [claimed] });
  });
});
