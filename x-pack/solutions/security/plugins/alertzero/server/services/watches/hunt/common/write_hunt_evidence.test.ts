/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deriveLastHuntStatus,
  MAX_LEDGER_TECHNIQUE_IDS,
  shouldStampHunt,
  writeHuntEvidence,
} from './write_hunt_evidence';

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

describe('shouldStampHunt', () => {
  it.each(['complete', 'incomplete_final', 'incomplete_retryable'] as const)(
    'stamps a confirmed hit on a %s run',
    (completeness) => {
      expect(shouldStampHunt({ hasConfirmedHit: true, completeness })).toBe(true);
    }
  );

  it.each(['complete', 'incomplete_final'] as const)(
    'stamps a %s run that found nothing, since repeating it could not cover more',
    (completeness) => {
      expect(shouldStampHunt({ hasConfirmedHit: false, completeness })).toBe(true);
    }
  );

  it('does not stamp a retryable run that found nothing, so the report stays eligible', () => {
    expect(shouldStampHunt({ hasConfirmedHit: false, completeness: 'incomplete_retryable' })).toBe(
      false
    );
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
  it('stamps the gate and marks nothing pending on a complete run', async () => {
    const esClient = makeEsClient();

    await writeHuntEvidence(esClient as never, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'complete',
      totalHits: 0,
    });

    expect(esClient.update.mock.calls[0][0].script.params).toEqual(
      expect.objectContaining({ stamp: true, coverage_pending: false })
    );
  });

  it('records a confirmed hit on a retryable run and leaves coverage pending', async () => {
    const esClient = makeEsClient();

    await writeHuntEvidence(esClient as never, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: true,
      completeness: 'incomplete_retryable',
      totalHits: 5,
    });

    expect(esClient.update.mock.calls[0][0].script.params).toEqual(
      expect.objectContaining({
        stamp: true,
        last_hunt_status: 'hit',
        last_hunt_event_hit_count: 5,
        coverage_pending: true,
      })
    );
  });

  it('writes only the ledger on a retryable run with no hit, so the stamp stays unset', async () => {
    const esClient = makeEsClient();

    await writeHuntEvidence(esClient as never, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'incomplete_retryable',
      totalHits: 0,
      searchedTechniqueIds: ['T1001'],
    });

    const [{ script }] = esClient.update.mock.calls[0];
    expect(script.params).toEqual(
      expect.objectContaining({
        stamp: false,
        coverage_pending: true,
        searched_technique_ids: ['T1001'],
      })
    );
    // The script applies the stamp keys only under `params.stamp`.
    expect(script.source).toMatch(/if \(params\.stamp\)/);
  });

  it('writes nothing for a retryable run with no hit that searched nothing', async () => {
    const esClient = makeEsClient();

    await writeHuntEvidence(esClient as never, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'incomplete_retryable',
      totalHits: 0,
      searchedTechniqueIds: [],
    });

    expect(esClient.update).not.toHaveBeenCalled();
  });

  it('unions the searched ids into the ledger rather than replacing it, within the cap', async () => {
    const esClient = makeEsClient();

    await writeHuntEvidence(esClient as never, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'complete',
      totalHits: 0,
      searchedTechniqueIds: ['T1001', 'T1002'],
    });

    const [{ script }] = esClient.update.mock.calls[0];
    expect(script.params.searched_technique_ids).toEqual(['T1001', 'T1002']);
    expect(script.params.max_ids).toBe(MAX_LEDGER_TECHNIQUE_IDS);
    expect(script.source).toContain('ids.addAll(el.hunted_technique_ids)');
  });

  it('sends an empty ledger update when the run reported no searched ids', async () => {
    const esClient = makeEsClient();

    await writeHuntEvidence(esClient as never, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'complete',
      totalHits: 0,
    });

    expect(esClient.update.mock.calls[0][0].script.params.searched_technique_ids).toEqual([]);
  });

  it('still never touches alert_hits* keys when writing the ledger', async () => {
    const esClient = makeEsClient();

    await writeHuntEvidence(esClient as never, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'complete',
      totalHits: 0,
      searchedTechniqueIds: ['T1001'],
    });

    expect(esClient.update.mock.calls[0][0].script.source).not.toContain('alert_hits');
  });
});
