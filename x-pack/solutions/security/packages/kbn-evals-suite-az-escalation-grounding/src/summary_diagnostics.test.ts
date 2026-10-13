/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { collectSummaryDiagnostics, summaryConcurrencyKey } from './summary_diagnostics';

const WORKFLOW = 'system-alertzero-investigation-summary';

const fakeFetch = ({
  events,
  runs,
  failConversation = false,
  failExecutions = false,
}: {
  events?: unknown[];
  runs?: unknown[];
  failConversation?: boolean;
  failExecutions?: boolean;
}) => {
  const paths: string[] = [];
  const fetch = (async (path: string) => {
    paths.push(path);
    if (path.startsWith('/api/agent_builder/conversations/')) {
      if (failConversation) throw new Error('500 conversation');
      return { id: 'esc-1', events };
    }
    if (path.startsWith(`/api/workflows/workflow/${WORKFLOW}/executions`)) {
      if (failExecutions) throw new Error('403 executions');
      return { results: runs };
    }
    throw new Error(`404 ${path}`);
  }) as unknown as HttpHandler;
  return { fetch, paths };
};

const collect = (fetch: HttpHandler) =>
  collectSummaryDiagnostics({
    fetch,
    escalationId: 'esc-1',
    workflowId: WORKFLOW,
    syncCompletedAt: '2026-10-09T13:50:00.000Z',
    summaryObservedAt: '2026-10-09T13:50:20.000Z',
  });

const added = (id: string, createdAt: string) => ({
  id: `ev-${id}`,
  type: 'attachment_added',
  created_at: createdAt,
  data: { attachment_id: id },
});

describe('collectSummaryDiagnostics', () => {
  it('queries the executions of this escalation by the workflow concurrency key', async () => {
    const { fetch, paths } = fakeFetch({ events: [], runs: [] });
    await collect(fetch);

    const executions = paths.find((path) => path.includes('/executions'))!;
    const query = new URLSearchParams(executions.split('?')[1]);
    expect(query.get('concurrencyGroupKey')).toBe(summaryConcurrencyKey(WORKFLOW, 'esc-1'));
    expect(query.get('concurrencyGroupKey')).toBe(`${WORKFLOW}:esc-1`);
    expect(query.get('omitStepRuns')).toBe('true');
  });

  it('reports a stale summary: every completed run started before the last attachment was added', async () => {
    const { fetch } = fakeFetch({
      events: [
        added('a2', '2026-10-09T13:49:58.000Z'),
        { id: 'ev-note', type: 'text_note', created_at: '2026-10-09T13:49:59.000Z' },
        added('a1', '2026-10-09T13:49:50.000Z'),
      ],
      runs: [
        {
          id: 'r1',
          status: 'completed',
          startedAt: '2026-10-09T13:49:51.000Z',
          finishedAt: '2026-10-09T13:49:57.000Z',
        },
        { id: 'r2', status: 'skipped', startedAt: null, finishedAt: null },
        { id: 'r3', status: 'queued', startedAt: null, finishedAt: null },
      ],
    });

    const diagnostics = await collect(fetch);

    expect(diagnostics.attachmentsAdded.map((a) => a.attachmentId)).toEqual(['a1', 'a2']);
    expect(diagnostics.lastAttachmentAddedAt).toBe('2026-10-09T13:49:58.000Z');
    expect(diagnostics.completedRunsStartedAfterLastAttachment).toBe(0);
    expect(diagnostics.unfinishedRuns).toBe(1);
    expect(diagnostics.summaryRunStatuses).toEqual({ completed: 1, skipped: 1, queued: 1 });
    expect(diagnostics.errors).toEqual([]);
  });

  it('counts a completed run that started after the last attachment', async () => {
    const { fetch } = fakeFetch({
      events: [added('a1', '2026-10-09T13:49:50.000Z')],
      runs: [
        {
          id: 'r1',
          status: 'completed',
          startedAt: '2026-10-09T13:49:55.000Z',
          finishedAt: '2026-10-09T13:50:01.000Z',
        },
      ],
    });

    expect((await collect(fetch)).completedRunsStartedAfterLastAttachment).toBe(1);
  });

  it('never throws: a failing read is recorded in errors and the other read still lands', async () => {
    const { fetch } = fakeFetch({
      events: [added('a1', '2026-10-09T13:49:50.000Z')],
      failExecutions: true,
    });
    const diagnostics = await collect(fetch);

    expect(diagnostics.attachmentsAdded).toHaveLength(1);
    expect(diagnostics.summaryRuns).toEqual([]);
    expect(diagnostics.errors).toEqual([expect.stringContaining('403 executions')]);

    const bothFail = await collect(
      fakeFetch({ failConversation: true, failExecutions: true }).fetch
    );
    expect(bothFail.errors).toHaveLength(2);
  });
});
