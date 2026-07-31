/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { IncidentForkStore, PND_INCIDENTS_INDEX } from './incident_fork_store';
import type { InvestigationIndexBootstrap } from './investigation_index_bootstrap';
import type { InvestigationRecordStore } from './investigation_record_store';
import type { InvestigationTimelineStore } from './investigation_timeline_store';

const INVESTIGATION = {
  id: 'inv-1',
  template_id: 'investigation' as const,
  title: 'Suspicious PowerShell on FIN-WS-04',
  createdAt: '2026-07-30T10:00:00.000Z',
  updatedAt: '2026-07-30T11:00:00.000Z',
  watch_id: 'watch-floor',
  watch_execution_id: 'exec-1',
  severity: 'high',
  assignee: 'analyst-a',
  pendingProposalCount: 1,
  events: [
    { id: 'evt-1', timestamp: '2026-07-30T10:00:00.000Z', type: 'observation', summary: 'first' },
    { id: 'evt-2', timestamp: '2026-07-30T10:30:00.000Z', type: 'observation', summary: 'second' },
  ],
};

const createDeps = (investigation: unknown = INVESTIGATION) => {
  const bootstrap = { ensureReady: jest.fn().mockResolvedValue(undefined) };
  const investigations = { getInvestigation: jest.fn().mockResolvedValue(investigation) };
  const timeline = { recordDeepWatchOutcome: jest.fn().mockResolvedValue(undefined) };
  return { bootstrap, investigations, timeline };
};

const createEsClient = (overrides: Record<string, unknown> = {}) =>
  ({
    indices: { exists: jest.fn().mockResolvedValue(true), create: jest.fn() },
    search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    get: jest.fn(),
    create: jest.fn().mockResolvedValue({ result: 'created' }),
    ...overrides,
  } as unknown as ElasticsearchClient);

const buildStore = (deps: ReturnType<typeof createDeps>) =>
  new IncidentForkStore(
    deps.bootstrap as unknown as InvestigationIndexBootstrap,
    deps.investigations as unknown as InvestigationRecordStore,
    deps.timeline as unknown as InvestigationTimelineStore
  );

describe('IncidentForkStore', () => {
  beforeEach(() => jest.clearAllMocks());

  it('forks to a NEW root and leaves the source Investigation untouched', async () => {
    const deps = createDeps();
    const esClient = createEsClient();
    const store = buildStore(deps);

    const result = await store.forkToIncident(esClient, { investigationId: 'inv-1' });

    expect(result.outcome).toBe('forked');
    // The write targets the incidents index — NOT an update of the investigation.
    const createCall = (esClient.create as jest.Mock).mock.calls[0][0];
    expect(createCall.index).toBe(PND_INCIDENTS_INDEX);
    expect(createCall.document.template_id).toBe('incident');
    // "Not a status rename": nothing mutates the source investigation doc.
    expect((esClient as unknown as { update?: jest.Mock }).update).toBeUndefined();
  });

  it('carries every prior thread forward plus the promotion audit event', async () => {
    const deps = createDeps();
    const esClient = createEsClient();
    const store = buildStore(deps);

    const result = await store.forkToIncident(esClient, {
      investigationId: 'inv-1',
      reason: 'confirmed lateral movement',
    });

    if (result.outcome !== 'forked') throw new Error('expected fork');
    // 2 carried + 1 fork event — lossless.
    expect(result.incident.events).toHaveLength(3);
    expect(result.incident.events.slice(0, 2).map((e) => e.id)).toEqual(['evt-1', 'evt-2']);
    const forkEvent = result.incident.events[2];
    expect(forkEvent.type).toBe('decision');
    expect(forkEvent.summary).toContain('promoted to Incident');
    expect(forkEvent.summary).toContain('confirmed lateral movement');
  });

  it('links lineage back to the source investigation', async () => {
    const deps = createDeps();
    const esClient = createEsClient();
    const store = buildStore(deps);

    const result = await store.forkToIncident(esClient, { investigationId: 'inv-1' });

    if (result.outcome !== 'forked') throw new Error('expected fork');
    expect(result.incident.forkedFromInvestigationId).toBe('inv-1');
    expect(result.incident.watch_id).toBe('watch-floor');
    expect(result.incident.severity).toBe('high');
  });

  it('records the promotion on the source investigation timeline too', async () => {
    const deps = createDeps();
    const esClient = createEsClient();
    const store = buildStore(deps);

    await store.forkToIncident(esClient, { investigationId: 'inv-1' });

    expect(deps.timeline.recordDeepWatchOutcome).toHaveBeenCalledWith(
      esClient,
      expect.objectContaining({ investigationId: 'inv-1' })
    );
  });

  it('is idempotent — a second promote returns the existing incident', async () => {
    const deps = createDeps();
    const existing = { id: 'incident-inv-1', forkedFromInvestigationId: 'inv-1', events: [] };
    const esClient = createEsClient({
      search: jest.fn().mockResolvedValue({ hits: { hits: [{ _source: existing }] } }),
    });
    const store = buildStore(deps);

    const result = await store.forkToIncident(esClient, { investigationId: 'inv-1' });

    expect(result.outcome).toBe('already_forked');
    // Crucially: no second root was opened.
    expect(esClient.create).not.toHaveBeenCalled();
  });

  it('returns investigation_not_found rather than forking a phantom root', async () => {
    const deps = createDeps(null);
    const esClient = createEsClient();
    const store = buildStore(deps);

    const result = await store.forkToIncident(esClient, { investigationId: 'missing' });

    expect(result.outcome).toBe('investigation_not_found');
    expect(esClient.create).not.toHaveBeenCalled();
  });

  it('resolves a concurrent fork race to the winner instead of throwing', async () => {
    const deps = createDeps();
    const raced = { id: 'incident-inv-1', forkedFromInvestigationId: 'inv-1', events: [] };
    const conflict = Object.assign(new Error('conflict'), { meta: { statusCode: 409 } });
    const esClient = createEsClient({
      create: jest.fn().mockRejectedValue(conflict),
      get: jest.fn().mockResolvedValue({ _source: raced }),
    });
    const store = buildStore(deps);

    const result = await store.forkToIncident(esClient, { investigationId: 'inv-1' });

    expect(result.outcome).toBe('already_forked');
  });
});
