/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';

import type { CorrelatedExecution } from '../../../runs/helpers/correlate_executions';
import { selectLatestRunPerWorkflow } from '.';

const correlated = ({
  id,
  startedAt = '2026-08-02T00:00:00.000Z',
  watchId = SYSTEM_SECURITY_WATCH_DEEP_ID,
}: {
  id: string;
  startedAt?: string;
  watchId?: string;
}): CorrelatedExecution =>
  ({
    correlationId: 'ad-1',
    event: undefined,
    execution: { id, startedAt },
    watchId,
  } as unknown as CorrelatedExecution);

describe('selectLatestRunPerWorkflow', () => {
  it('returns no run ids for no correlated executions', () => {
    expect(selectLatestRunPerWorkflow([])).toEqual([]);
  });

  it('returns the only run id when one execution correlated', () => {
    expect(selectLatestRunPerWorkflow([correlated({ id: 'run-deep' })])).toEqual(['run-deep']);
  });

  it('keeps only the newest run of a re-triggered workflow', () => {
    const runIds = selectLatestRunPerWorkflow([
      correlated({ id: 'run-new', startedAt: '2026-08-02T00:00:00.000Z' }),
      correlated({ id: 'run-stale', startedAt: '2026-08-01T00:00:00.000Z' }),
    ]);

    expect(runIds).toEqual(['run-new']);
  });

  it('picks the newest run regardless of input order', () => {
    const runIds = selectLatestRunPerWorkflow([
      correlated({ id: 'run-stale', startedAt: '2026-08-01T00:00:00.000Z' }),
      correlated({ id: 'run-new', startedAt: '2026-08-02T00:00:00.000Z' }),
    ]);

    expect(runIds).toEqual(['run-new']);
  });

  it('returns one run id per correlated workflow', () => {
    const runIds = selectLatestRunPerWorkflow([
      correlated({ id: 'run-deep', watchId: SYSTEM_SECURITY_WATCH_DEEP_ID }),
      correlated({ id: 'run-detection', watchId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID }),
      correlated({ id: 'run-floor', watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID }),
    ]);

    expect(runIds).toEqual(['run-deep', 'run-detection', 'run-floor']);
  });

  it('scopes the newest-run choice to each workflow independently', () => {
    const runIds = selectLatestRunPerWorkflow([
      correlated({
        id: 'run-detection',
        startedAt: '2026-08-03T00:00:00.000Z',
        watchId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
      }),
      correlated({
        id: 'run-deep-new',
        startedAt: '2026-08-02T00:00:00.000Z',
        watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      }),
      correlated({
        id: 'run-deep-stale',
        startedAt: '2026-08-01T00:00:00.000Z',
        watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      }),
    ]);

    expect(runIds).toEqual(['run-detection', 'run-deep-new']);
  });

  it('prefers a run with a parseable startedAt over one without', () => {
    const runIds = selectLatestRunPerWorkflow([
      correlated({ id: 'run-undated', startedAt: '' }),
      correlated({ id: 'run-dated', startedAt: '2026-08-01T00:00:00.000Z' }),
    ]);

    expect(runIds).toEqual(['run-dated']);
  });

  it('keeps the first run when neither startedAt parses', () => {
    const runIds = selectLatestRunPerWorkflow([
      correlated({ id: 'run-first', startedAt: '' }),
      correlated({ id: 'run-second', startedAt: 'not-a-date' }),
    ]);

    expect(runIds).toEqual(['run-first']);
  });
});
