/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { HUNT_REPORTS_INDEX } from '../../../../../../common/constants';
import { MAX_HUNT_TECHNIQUE_IDS } from '../hunt_technique_limit';
import { writeHuntEvidence } from '../write_hunt_evidence';
import type { WriteHuntEvidenceParams } from '../write_hunt_evidence';

interface StoredElement {
  space_id: string;
  last_hunted_at?: string;
  last_hunt_status?: string;
  last_hunt_run_id?: string;
  last_hunt_event_hit_count?: number;
  hunted_technique_ids?: string[];
  pending_technique_ids?: string[];
  coverage_pending?: boolean;
  alert_hits_total?: number;
  alert_hits?: { window: string; ioc_match_hits: number };
}

interface StoredReport {
  evidence?: StoredElement[];
}

const SPACE = 'default';

describe('writeHuntEvidence against Elasticsearch', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let logger = loggingSystemMock.createLogger();
  let reportCounter = 0;

  const newReport = async (evidence?: StoredElement[]): Promise<string> => {
    reportCounter += 1;
    const reportId = `report-${reportCounter}`;
    await esClient.index({
      index: HUNT_REPORTS_INDEX,
      id: reportId,
      document: evidence ? { evidence } : {},
      refresh: true,
    });
    return reportId;
  };

  const write = (
    reportId: string,
    params: Omit<WriteHuntEvidenceParams, 'spaceId' | 'reportId' | 'totalHits'> & {
      totalHits?: number;
    }
  ) => writeHuntEvidence(esClient, { spaceId: SPACE, reportId, totalHits: 0, ...params }, logger);

  const element = async (reportId: string, spaceId = SPACE): Promise<StoredElement | undefined> => {
    const { _source: source } = await esClient.get<StoredReport>({
      index: HUNT_REPORTS_INDEX,
      id: reportId,
    });
    return source?.evidence?.find((candidate) => candidate.space_id === spaceId);
  };

  const pause = () => new Promise((resolve) => setTimeout(resolve, 15));

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (timeout) => jest.setTimeout(timeout),
      settings: { es: { license: 'basic' } },
    });
    esServer = await startES();
    esClient = esServer.es.getClient() as unknown as ElasticsearchClient;

    // The per-space evidence element, as the threat intel index template maps it. The template
    // lives in security_solution, which this plugin cannot import.
    await esClient.indices.create({
      index: HUNT_REPORTS_INDEX,
      mappings: {
        dynamic: 'strict',
        properties: {
          evidence: {
            type: 'nested',
            properties: {
              space_id: { type: 'keyword' },
              alert_hits_total: { type: 'integer' },
              alert_hits: {
                properties: {
                  window: { type: 'keyword' },
                  computed_at: { type: 'date' },
                  ioc_match_hits: { type: 'integer' },
                  technique_overlap_hits: { type: 'integer' },
                },
              },
              last_hunted_at: { type: 'date' },
              last_hunt_status: { type: 'keyword' },
              last_hunt_run_id: { type: 'keyword' },
              last_hunt_event_hit_count: { type: 'integer' },
              hunted_technique_ids: { type: 'keyword' },
              pending_technique_ids: { type: 'keyword' },
              coverage_pending: { type: 'boolean' },
            },
          },
        },
      },
    });
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  it('records a confirmed hit and the ledger on a retryable run', async () => {
    const reportId = await newReport();

    await write(reportId, {
      runId: 'run-1',
      hasConfirmedHit: true,
      completeness: 'incomplete_retryable',
      totalHits: 4,
      searchedTechniqueIds: ['T1001', 'T1002'],
      pendingTechniqueIds: ['T1003'],
    });

    expect(await element(reportId)).toEqual(
      expect.objectContaining({
        space_id: SPACE,
        last_hunt_status: 'hit',
        last_hunt_run_id: 'run-1',
        last_hunt_event_hit_count: 4,
        hunted_technique_ids: ['T1001', 'T1002'],
        pending_technique_ids: ['T1003'],
        coverage_pending: true,
      })
    );
    expect((await element(reportId))?.last_hunted_at).toEqual(expect.any(String));
  });

  it('writes only the ledger on a retryable run that found nothing, leaving the stamp unset', async () => {
    const reportId = await newReport();

    await write(reportId, {
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'incomplete_retryable',
      searchedTechniqueIds: ['T1001'],
      pendingTechniqueIds: ['T1002'],
    });

    const stored = await element(reportId);
    expect(stored).toEqual({
      space_id: SPACE,
      hunted_technique_ids: ['T1001'],
      pending_technique_ids: ['T1002'],
      coverage_pending: true,
    });
  });

  describe('a continuation after a retryable hit', () => {
    const hitThenContinue = async (
      continuation: Pick<WriteHuntEvidenceParams, 'completeness' | 'replayedWholeReport'>
    ) => {
      const reportId = await newReport();
      await write(reportId, {
        runId: 'run-hit',
        hasConfirmedHit: true,
        completeness: 'incomplete_retryable',
        totalHits: 7,
        searchedTechniqueIds: ['T1001', 'T1002'],
        pendingTechniqueIds: ['T1003'],
      });
      const first = await element(reportId);
      await pause();
      await write(reportId, {
        runId: 'run-next',
        hasConfirmedHit: false,
        totalHits: 0,
        searchedTechniqueIds: ['T1003'],
        pendingTechniqueIds: [],
        ...continuation,
      });
      return { reportId, first, second: await element(reportId) };
    };

    it('keeps the hit, moves the hunt time, unions the ledger and settles coverage', async () => {
      const { first, second } = await hitThenContinue({ completeness: 'complete' });

      expect(second).toEqual(
        expect.objectContaining({
          last_hunt_status: 'hit',
          last_hunt_run_id: 'run-hit',
          last_hunt_event_hit_count: 7,
          hunted_technique_ids: ['T1001', 'T1002', 'T1003'],
          pending_technique_ids: [],
          coverage_pending: false,
        })
      );
      expect(new Date(second?.last_hunted_at ?? 0).getTime()).toBeGreaterThan(
        new Date(first?.last_hunted_at ?? 0).getTime()
      );
    });

    it('lets a replay that finished complete replace the hit', async () => {
      const { second } = await hitThenContinue({
        completeness: 'complete',
        replayedWholeReport: true,
      });

      expect(second).toEqual(
        expect.objectContaining({ last_hunt_status: 'clean', last_hunt_run_id: 'run-next' })
      );
    });

    it('does not let a replay that left part of the report unsearched replace the hit', async () => {
      const { second } = await hitThenContinue({
        completeness: 'incomplete_final',
        replayedWholeReport: true,
      });

      expect(second).toEqual(
        expect.objectContaining({ last_hunt_status: 'hit', last_hunt_run_id: 'run-hit' })
      );
    });
  });

  it('keeps the recorded pending ids when Tier 2 did not run, and replaces them when it did', async () => {
    const reportId = await newReport();
    await write(reportId, {
      runId: 'run-1',
      hasConfirmedHit: false,
      completeness: 'incomplete_retryable',
      searchedTechniqueIds: ['T1001'],
      pendingTechniqueIds: ['T1002', 'T1003'],
    });

    await write(reportId, {
      runId: 'run-2',
      hasConfirmedHit: false,
      completeness: 'incomplete_retryable',
      searchedTechniqueIds: ['T1004'],
    });
    expect((await element(reportId))?.pending_technique_ids).toEqual(['T1002', 'T1003']);

    await write(reportId, {
      runId: 'run-3',
      hasConfirmedHit: false,
      completeness: 'incomplete_retryable',
      searchedTechniqueIds: ['T1002'],
      pendingTechniqueIds: ['T1003', 'T1005'],
    });
    expect(await element(reportId)).toEqual(
      expect.objectContaining({
        pending_technique_ids: ['T1003', 'T1005'],
        hunted_technique_ids: ['T1001', 'T1004', 'T1002'],
        coverage_pending: true,
      })
    );
  });

  it('leaves alert attribution and other spaces evidence untouched', async () => {
    const reportId = await newReport([
      {
        space_id: SPACE,
        alert_hits_total: 5,
        alert_hits: { window: '7d', ioc_match_hits: 5 },
      },
      {
        space_id: 'other',
        last_hunted_at: '2026-01-01T00:00:00.000Z',
        last_hunt_status: 'clean',
        last_hunt_run_id: 'other-run',
        hunted_technique_ids: ['T9999'],
        coverage_pending: false,
      },
    ]);

    await write(reportId, {
      runId: 'run-1',
      hasConfirmedHit: true,
      completeness: 'incomplete_retryable',
      totalHits: 2,
      searchedTechniqueIds: ['T1001'],
      pendingTechniqueIds: ['T1002'],
    });

    expect(await element(reportId)).toEqual(
      expect.objectContaining({
        alert_hits_total: 5,
        alert_hits: { window: '7d', ioc_match_hits: 5 },
        last_hunt_status: 'hit',
      })
    );
    expect(await element(reportId, 'other')).toEqual({
      space_id: 'other',
      last_hunted_at: '2026-01-01T00:00:00.000Z',
      last_hunt_status: 'clean',
      last_hunt_run_id: 'other-run',
      hunted_technique_ids: ['T9999'],
      coverage_pending: false,
    });
  });

  it('treats an element written before the ledger existed as not pending', async () => {
    const reportId = await newReport([
      {
        space_id: SPACE,
        last_hunted_at: '2026-01-01T00:00:00.000Z',
        last_hunt_status: 'hit',
        last_hunt_run_id: 'old-run',
        last_hunt_event_hit_count: 3,
      },
    ]);

    await write(reportId, {
      runId: 'run-new',
      hasConfirmedHit: false,
      completeness: 'complete',
      searchedTechniqueIds: ['T1001'],
    });

    // No `coverage_pending` flag means no continuation, so the new result replaces the old one.
    expect(await element(reportId)).toEqual(
      expect.objectContaining({
        last_hunt_status: 'clean',
        last_hunt_run_id: 'run-new',
        hunted_technique_ids: ['T1001'],
        coverage_pending: false,
      })
    );
  });

  describe('a ledger that is already full', () => {
    const fullLedger = Array.from({ length: MAX_HUNT_TECHNIQUE_IDS }, (_, index) => `T${index}`);

    it('settles coverage, drops the new ids and stamps the report so it leaves the sweep pool', async () => {
      // An element a retryable no-hit run left behind: a ledger and pending ids, but no stamp.
      const reportId = await newReport([
        {
          space_id: SPACE,
          hunted_technique_ids: fullLedger,
          pending_technique_ids: ['X1', 'X2'],
          coverage_pending: true,
        },
      ]);

      await write(reportId, {
        runId: 'run-over',
        hasConfirmedHit: false,
        completeness: 'incomplete_retryable',
        searchedTechniqueIds: ['X1', 'X2'],
        pendingTechniqueIds: ['X3'],
      });

      const stored = await element(reportId);
      expect(stored?.hunted_technique_ids).toEqual(fullLedger);
      expect(stored).toEqual(
        expect.objectContaining({
          coverage_pending: false,
          pending_technique_ids: [],
          last_hunt_status: 'incomplete',
          last_hunt_run_id: 'run-over',
          last_hunted_at: expect.any(String),
        })
      );
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('coverage was settled'));
    });

    it('still keeps a pending hit when the cap settles a continuation', async () => {
      const reportId = await newReport([
        {
          space_id: SPACE,
          last_hunted_at: '2026-01-01T00:00:00.000Z',
          last_hunt_status: 'hit',
          last_hunt_run_id: 'run-hit',
          last_hunt_event_hit_count: 4,
          hunted_technique_ids: fullLedger,
          pending_technique_ids: ['X1'],
          coverage_pending: true,
        },
      ]);

      await write(reportId, {
        runId: 'run-over',
        hasConfirmedHit: false,
        completeness: 'incomplete_retryable',
        searchedTechniqueIds: ['X1'],
        pendingTechniqueIds: ['X2'],
      });

      expect(await element(reportId)).toEqual(
        expect.objectContaining({
          coverage_pending: false,
          last_hunt_status: 'hit',
          last_hunt_run_id: 'run-hit',
          last_hunt_event_hit_count: 4,
        })
      );
    });
  });

  it('rejects a write for a report that does not exist', async () => {
    await expect(
      write('no-such-report', {
        runId: 'run-1',
        hasConfirmedHit: true,
        completeness: 'complete',
        searchedTechniqueIds: ['T1001'],
      })
    ).rejects.toThrow();
  });
});
