/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveLastHuntStatus, writeHuntEvidence } from './write_hunt_evidence';

describe('deriveLastHuntStatus', () => {
  it('collapses to exactly the three statuses the UI labels', () => {
    expect(deriveLastHuntStatus({ hasConfirmedHit: true, completeness: 'complete' })).toBe('hit');
    expect(deriveLastHuntStatus({ hasConfirmedHit: true, completeness: 'incomplete_final' })).toBe(
      'hit'
    );
    expect(deriveLastHuntStatus({ hasConfirmedHit: false, completeness: 'complete' })).toBe(
      'clean'
    );
    expect(
      deriveLastHuntStatus({ hasConfirmedHit: false, completeness: 'incomplete_retryable' })
    ).toBe('incomplete');
    expect(deriveLastHuntStatus({ hasConfirmedHit: false, completeness: 'incomplete_final' })).toBe(
      'incomplete'
    );
  });

  it('a confirmed hit wins over completeness', () => {
    expect(
      deriveLastHuntStatus({ hasConfirmedHit: true, completeness: 'incomplete_retryable' })
    ).toBe('hit');
  });
});

describe('writeHuntEvidence', () => {
  const makeEsClient = () => ({ update: jest.fn().mockResolvedValue({}) });

  it('writes the evidence fields the candidate selection gate filters on', async () => {
    const esClient = makeEsClient();

    await writeHuntEvidence(esClient as never, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: true,
      completeness: 'complete',
      totalHits: 3,
    });

    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.kibana-threat-reports',
        id: 'report-1',
        retry_on_conflict: 3,
        script: expect.objectContaining({
          lang: 'painless',
          source: expect.stringContaining('last_hunted_at'),
          params: expect.objectContaining({
            space_id: 'default',
            last_hunt_status: 'hit',
            last_hunt_run_id: 'run-1',
            last_hunt_event_hit_count: 3,
          }),
        }),
      })
    );
  });

  it('keys the evidence element by space, matching the candidate selection gate', async () => {
    const esClient = makeEsClient();

    await writeHuntEvidence(esClient as never, {
      spaceId: 'hunt-space',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'complete',
      totalHits: 0,
    });

    const [{ script }] = esClient.update.mock.calls[0];
    expect(script.source).toEqual(expect.stringContaining('space_id'));
    expect(script.params.space_id).toBe('hunt-space');
  });

  it('never sets alert_hits* keys, which belong to the Attribute Alerts writer on the same element', async () => {
    const esClient = makeEsClient();

    await writeHuntEvidence(esClient as never, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'complete',
      totalHits: 0,
    });

    const [{ script }] = esClient.update.mock.calls[0];
    expect(script.source).not.toContain('alert_hits');
  });

  it('records a real zero hit count rather than dropping it, distinct from never searched', async () => {
    const esClient = makeEsClient();

    await writeHuntEvidence(esClient as never, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'complete',
      totalHits: 0,
    });

    expect(esClient.update.mock.calls[0][0].script.params.last_hunt_event_hit_count).toBe(0);
  });
});
