/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { MAX_HUNT_TECHNIQUE_IDS } from './hunt_technique_limit';
import { deriveLastHuntStatus, shouldStampHunt, writeHuntEvidence } from './write_hunt_evidence';
import type { WriteHuntEvidenceParams } from './write_hunt_evidence';

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
  const logger = loggingSystemMock.createLogger();
  const makeEsClient = (stored?: Array<{ space_id: string; coverage_pending: boolean }>) => ({
    update: jest.fn().mockResolvedValue(stored ? { get: { _source: { evidence: stored } } } : {}),
  });
  const write = (esClient: ReturnType<typeof makeEsClient>, params: WriteHuntEvidenceParams) =>
    writeHuntEvidence(esClient as never, params, logger);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes the evidence fields the candidate selection gate filters on', async () => {
    const esClient = makeEsClient();

    await write(esClient, {
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

    await write(esClient, {
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

    await write(esClient, {
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

    await write(esClient, {
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

    await write(esClient, {
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

    await write(esClient, {
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

    await write(esClient, {
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
    // The script applies the stamp keys only under `params.stamp`, or when the cap settled the run.
    expect(script.source).toMatch(/if \(params\.stamp \|\| settledByCap\)/);
  });

  it('writes nothing for a retryable run with no hit that searched nothing', async () => {
    const esClient = makeEsClient();

    await write(esClient, {
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

    await write(esClient, {
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
    expect(script.params.max_ids).toBe(MAX_HUNT_TECHNIQUE_IDS);
    expect(script.source).toContain('ids.addAll(el.hunted_technique_ids)');
  });

  it('sends an empty ledger update when the run reported no searched ids', async () => {
    const esClient = makeEsClient();

    await write(esClient, {
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

    await write(esClient, {
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

  it('keeps an earlier hit when a continuation finds nothing, but still moves the hunt time', async () => {
    const esClient = makeEsClient();

    await write(esClient, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-2',
      hasConfirmedHit: false,
      completeness: 'complete',
      totalHits: 0,
      searchedTechniqueIds: ['T1002'],
    });

    const [{ script }] = esClient.update.mock.calls[0];
    // A continuation is an element that is still `coverage_pending` with a `hit` stamped; the
    // new status is not a hit, so only `last_hunted_at` is written.
    expect(script.source).toContain(
      "boolean keepHit = !params.replayed_whole_report && el.coverage_pending == true && el.last_hunt_status == 'hit' && params.last_hunt_status != 'hit';"
    );
    expect(script.source).toMatch(/if \(!keepHit\) \{[^}]*last_hunt_status[^}]*last_hunt_run_id/s);
    expect(script.params.last_hunt_status).toBe('clean');
  });

  it('settles coverage_pending when the union would not fit the cap', async () => {
    const esClient = makeEsClient();

    await write(esClient, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'incomplete_retryable',
      totalHits: 0,
      searchedTechniqueIds: ['T1001'],
    });

    const [{ script }] = esClient.update.mock.calls[0];
    expect(script.source).toContain(
      'boolean pending = params.coverage_pending && ids.size() <= params.max_ids;'
    );
    expect(script.params.coverage_pending).toBe(true);
  });

  it('stamps the report when the cap is what settled a retryable run, so it leaves the sweep pool', async () => {
    const esClient = makeEsClient();

    await write(esClient, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'incomplete_retryable',
      totalHits: 0,
      searchedTechniqueIds: ['T1001'],
    });

    const [{ script }] = esClient.update.mock.calls[0];
    // The run itself does not stamp (it is retryable and found nothing), so the script has to.
    expect(script.params.stamp).toBe(false);
    expect(script.params.last_hunt_status).toBe('incomplete');
    expect(script.source).toContain('boolean settledByCap = params.coverage_pending && !pending;');
    expect(script.source).toContain('if (params.stamp || settledByCap) {');
  });

  describe('a manual replay of the whole report', () => {
    const pendingHitRun = {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-2',
      hasConfirmedHit: false,
      completeness: 'complete' as const,
      totalHits: 0,
    };

    it('lets the replay replace a pending hit, since it searched everything', async () => {
      const esClient = makeEsClient();

      await write(esClient, { ...pendingHitRun, replayedWholeReport: true });

      const [{ script }] = esClient.update.mock.calls[0];
      expect(script.params.replayed_whole_report).toBe(true);
      expect(script.source).toContain('boolean keepHit = !params.replayed_whole_report &&');
    });

    it.each(['incomplete_final', 'incomplete_retryable'] as const)(
      'does not let a replay that ended %s overrule a hit, since it left part of the report unsearched',
      async (completeness) => {
        const esClient = makeEsClient();

        await write(esClient, {
          ...pendingHitRun,
          completeness,
          searchedTechniqueIds: ['T1001'],
          replayedWholeReport: true,
        });

        expect(esClient.update.mock.calls[0][0].script.params.replayed_whole_report).toBe(false);
      }
    );

    it('keeps the guard on for a run that is not a replay', async () => {
      const esClient = makeEsClient();

      await write(esClient, pendingHitRun);

      expect(esClient.update.mock.calls[0][0].script.params.replayed_whole_report).toBe(false);
    });
  });

  describe('pending techniques', () => {
    const retryable = {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'incomplete_retryable' as const,
      totalHits: 0,
    };

    it("sends the run's pending ids so they replace what the report recorded", async () => {
      const esClient = makeEsClient();

      await write(esClient, {
        ...retryable,
        searchedTechniqueIds: ['T1001'],
        pendingTechniqueIds: ['T1002', 'T1003'],
      });

      const [{ script }] = esClient.update.mock.calls[0];
      expect(script.params.pending_technique_ids).toEqual(['T1002', 'T1003']);
      expect(script.source).toContain('el.pending_technique_ids = pendingIds;');
    });

    it('sends null when Tier 2 did not run, so the report keeps what it recorded', async () => {
      const esClient = makeEsClient();

      await write(esClient, { ...retryable, hasConfirmedHit: true, searchedTechniqueIds: [] });

      expect(esClient.update.mock.calls[0][0].script.params.pending_technique_ids).toBeNull();
      expect(esClient.update.mock.calls[0][0].script.source).toContain(
        'params.pending_technique_ids != null'
      );
    });

    it('clears the pending ids whenever coverage is settled', async () => {
      const esClient = makeEsClient();

      await write(esClient, {
        ...retryable,
        completeness: 'complete',
        searchedTechniqueIds: ['T1001'],
        pendingTechniqueIds: [],
      });

      expect(esClient.update.mock.calls[0][0].script.source).toContain(
        'el.pending_technique_ids = new ArrayList();'
      );
    });

    it('records pending ids even when the run searched nothing and found nothing', async () => {
      const esClient = makeEsClient();

      await write(esClient, {
        ...retryable,
        searchedTechniqueIds: [],
        pendingTechniqueIds: ['T1002'],
      });

      expect(esClient.update).toHaveBeenCalledTimes(1);
    });

    it('still writes nothing when the run searched nothing and left nothing pending', async () => {
      const esClient = makeEsClient();

      await write(esClient, {
        ...retryable,
        searchedTechniqueIds: [],
        pendingTechniqueIds: [],
      });

      expect(esClient.update).not.toHaveBeenCalled();
    });
  });

  it('warns when the cap settled a run that wanted to continue', async () => {
    const esClient = makeEsClient([{ space_id: 'default', coverage_pending: false }]);

    await write(esClient, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'incomplete_retryable',
      totalHits: 0,
      searchedTechniqueIds: ['T1001'],
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('report-1'));
  });

  it('does not warn when the run is still pending, or when it never wanted to continue', async () => {
    const pending = makeEsClient([{ space_id: 'default', coverage_pending: true }]);
    await write(pending, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'incomplete_retryable',
      totalHits: 0,
      searchedTechniqueIds: ['T1001'],
    });

    const done = makeEsClient([{ space_id: 'default', coverage_pending: false }]);
    await write(done, {
      spaceId: 'default',
      reportId: 'report-1',
      runId: 'run-2',
      hasConfirmedHit: false,
      completeness: 'complete',
      totalHits: 0,
      searchedTechniqueIds: ['T1002'],
    });

    expect(logger.warn).not.toHaveBeenCalled();
  });
});
