/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { CortexTelemetry } from '../telemetry';
import { applyCortexEdits, optimizeCortex, renderToolCalls } from './optimize';
import type { CortexPageStore } from './page_store';

const createTelemetry = (): jest.Mocked<CortexTelemetry> => ({
  reportHydrated: jest.fn(),
  reportEditsApplied: jest.fn(),
});

describe('applyCortexEdits', () => {
  it('upserts, corroborates, and archives proposed pages', async () => {
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [],
        stats: { total: 0, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue({}),
      corroborate: jest.fn().mockResolvedValue({}),
      archive: jest.fn().mockResolvedValue({}),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    const telemetry = createTelemetry();
    await applyCortexEdits({
      store,
      telemetry,
      logger: loggerMock.create(),
      edits: [
        {
          action: 'upsert',
          entity_type: 'service',
          slug: 'checkout',
          title: 'Checkout',
          content: 'Checkout talks to Redis.',
        },
        {
          action: 'corroborate',
          entity_type: 'service',
          slug: 'payments',
          title: 'Payments',
        },
        {
          action: 'archive',
          entity_type: 'topic',
          slug: 'old-note',
          title: 'Old note',
        },
      ],
    });

    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'service',
        slug: 'checkout',
        title: 'Checkout',
      })
    );
    expect(store.corroborate).toHaveBeenCalledWith('cortex_service_payments');
    expect(store.archive).toHaveBeenCalledWith('cortex_topic_old-note');
    expect(telemetry.reportEditsApplied).toHaveBeenCalledWith([
      { action: 'upsert', entityType: 'service' },
      { action: 'corroborate', entityType: 'service' },
      { action: 'archive', entityType: 'topic' },
    ]);
  });

  // Pages are written one at a time, so a mid-loop failure still leaves the earlier edits in the
  // wiki. Dropping their counts would understate writes exactly when a run went wrong.
  it('reports the edits already written when a later edit throws', async () => {
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [],
        stats: { total: 0, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue({}),
      corroborate: jest.fn().mockRejectedValue(new Error('request_timeout')),
      archive: jest.fn().mockResolvedValue({}),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    const telemetry = createTelemetry();
    await expect(
      applyCortexEdits({
        store,
        telemetry,
        logger: loggerMock.create(),
        edits: [
          {
            action: 'upsert',
            entity_type: 'service',
            slug: 'checkout',
            title: 'Checkout',
            content: 'Checkout talks to Redis.',
          },
          {
            action: 'corroborate',
            entity_type: 'service',
            slug: 'payments',
            title: 'Payments',
          },
          {
            action: 'archive',
            entity_type: 'topic',
            slug: 'old-note',
            title: 'Old note',
          },
        ],
      })
    ).rejects.toThrow('request_timeout');

    expect(telemetry.reportEditsApplied).toHaveBeenCalledWith([
      { action: 'upsert', entityType: 'service' },
    ]);
    expect(store.archive).not.toHaveBeenCalled();
  });

  // A proposal naming a page that does not exist leaves the wiki untouched, so counting it would
  // overstate how much the optimizer actually writes.
  it('reports only the edits that changed a page', async () => {
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [],
        stats: { total: 0, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue({}),
      corroborate: jest.fn().mockResolvedValue(undefined),
      archive: jest.fn().mockResolvedValue(undefined),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    const telemetry = createTelemetry();
    await applyCortexEdits({
      store,
      telemetry,
      logger: loggerMock.create(),
      edits: [
        {
          action: 'corroborate',
          entity_type: 'service',
          slug: 'missing',
          title: 'Missing',
        },
      ],
    });

    expect(telemetry.reportEditsApplied).toHaveBeenCalledWith([]);
  });

  it('rewrites prefixed slugs onto the existing page', async () => {
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [
          {
            id: 'cortex_service_email-service',
            title: 'Email Service',
            entity_type: 'service',
            status: 'established',
            corroborations: 1,
            updated_at: '2026-09-09T12:00:00.000Z',
          },
        ],
        stats: { total: 1, established: 1, total_corroborations: 1 },
      }),
      get: jest.fn().mockResolvedValue({
        id: 'cortex_service_email-service',
        title: 'Email Service',
        entity_type: 'service',
        status: 'established',
        corroborations: 1,
        updated_at: '2026-09-09T12:00:00.000Z',
        slug: 'email-service',
        content: 'Sends mail.',
      }),
      upsert: jest.fn().mockResolvedValue({}),
      corroborate: jest.fn(),
      archive: jest.fn(),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    await applyCortexEdits({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      edits: [
        {
          action: 'upsert',
          entity_type: 'service',
          slug: 'cortex-service-email-service',
          title: 'Email Service',
          content: 'Updated.',
        },
      ],
    });

    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'email-service',
        content: 'Updated.',
        status: 'established',
      })
    );
  });

  // Promotion has to come from a later run. Otherwise one investigation could create a page and
  // vouch for it in the same breath.
  it('creates new pages as tentative and ignores a same-run corroboration of them', async () => {
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [],
        stats: { total: 0, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue({}),
      corroborate: jest.fn().mockResolvedValue({}),
      archive: jest.fn(),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    const telemetry = createTelemetry();
    await applyCortexEdits({
      store,
      telemetry,
      logger: loggerMock.create(),
      edits: [
        {
          action: 'upsert',
          entity_type: 'integration',
          slug: 'logging-us-west-2',
          title: 'logging-us-west-2 CCS remote',
          content: '## Overview\nRemote cluster for proxy logs.',
        },
        {
          action: 'corroborate',
          entity_type: 'integration',
          slug: 'logging-us-west-2',
          title: 'logging-us-west-2 CCS remote',
        },
      ],
    });

    expect(store.upsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'tentative' }));
    expect(store.corroborate).not.toHaveBeenCalled();
    expect(telemetry.reportEditsApplied).toHaveBeenCalledWith([
      { action: 'upsert', entityType: 'integration' },
    ]);
  });

  // Rewriting a page is how the optimizer usually reconfirms it. If only an explicit corroborate
  // counted, recurring findings would stay tentative forever.
  it('counts a rewrite of an existing page as one corroboration and promotes it', async () => {
    const existing = {
      id: 'cortex_service_otel-demo-cart',
      title: 'Cart',
      entity_type: 'service' as const,
      status: 'tentative' as const,
      corroborations: 0,
      updated_at: '2026-09-09T12:00:00.000Z',
      slug: 'otel-demo-cart',
      content: 'Cart uses Redis.',
    };
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [existing],
        stats: { total: 1, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn().mockResolvedValue(existing),
      upsert: jest.fn().mockResolvedValue({}),
      corroborate: jest.fn().mockResolvedValue({}),
      archive: jest.fn(),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    await applyCortexEdits({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      edits: [
        {
          action: 'upsert',
          entity_type: 'service',
          slug: 'otel-demo-cart',
          title: 'Cart',
          content: 'Cart uses Redis and flagd.',
        },
        {
          action: 'corroborate',
          entity_type: 'service',
          slug: 'otel-demo-cart',
          title: 'Cart',
        },
      ],
    });

    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'established', corroborations: 1 })
    );
    expect(store.corroborate).not.toHaveBeenCalled();
  });

  it('revives a rewritten archived page as tentative without counting it', async () => {
    const existing = {
      id: 'cortex_topic_old-note',
      title: 'Old note',
      entity_type: 'topic' as const,
      status: 'archived' as const,
      corroborations: 3,
      updated_at: '2026-09-09T12:00:00.000Z',
      slug: 'old-note',
      content: 'Stale.',
    };
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [existing],
        stats: { total: 1, established: 0, total_corroborations: 3 },
      }),
      get: jest.fn().mockResolvedValue(existing),
      upsert: jest.fn().mockResolvedValue({}),
      corroborate: jest.fn(),
      archive: jest.fn(),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    await applyCortexEdits({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      edits: [
        {
          action: 'upsert',
          entity_type: 'topic',
          slug: 'old-note',
          title: 'Old note',
          content: 'Relevant again.',
        },
      ],
    });

    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'tentative', corroborations: 3 })
    );
  });
});

describe('renderToolCalls', () => {
  it('renders one line per call with its parameters', () => {
    expect(
      renderToolCalls([
        { tool_id: 'nightshift.sandbox_bash', params: { command: 'esql "FROM logs-*"' } },
        { params: {} },
      ])
    ).toBe('- nightshift.sandbox_bash {"command":"esql \\"FROM logs-*\\""}\n- unknown {}');
  });

  it('says how many calls it dropped once the budget is spent', () => {
    const calls = Array.from({ length: 40 }, () => ({
      tool_id: 'nightshift.sandbox_bash',
      params: { command: 'x'.repeat(2_000) },
    }));

    const lines = renderToolCalls(calls).split('\n');

    expect(lines.length).toBeLessThan(calls.length);
    expect(lines[lines.length - 1]).toBe(
      `- (${calls.length - lines.length + 1} more tool calls omitted)`
    );
  });

  it('marks an empty round explicitly', () => {
    expect(renderToolCalls([])).toBe('(none)');
  });
});

describe('optimizeCortex', () => {
  it('applies LLM proposals from the investigation transcript', async () => {
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [],
        stats: { total: 0, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue({}),
      corroborate: jest.fn(),
      archive: jest.fn(),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    await optimizeCortex({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      userMessage: 'Why is checkout slow?',
      assistantMessage: 'Redis lock contention on checkout.',
      toolCalls: [],
      proposeEdits: async () => ({
        edits: [
          {
            action: 'upsert',
            entity_type: 'service',
            slug: 'checkout',
            title: 'Checkout',
            content: 'Redis lock contention.',
          },
        ],
      }),
    });

    expect(store.pruneDuplicates).toHaveBeenCalled();
    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'checkout',
        content: 'Redis lock contention.',
      })
    );
  });

  it('shows the optimizer the tool calls between the prompt and the answer', async () => {
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [],
        stats: { total: 0, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn(),
      upsert: jest.fn(),
      corroborate: jest.fn(),
      archive: jest.fn(),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };
    const proposeEdits = jest.fn().mockResolvedValue({ edits: [] });

    await optimizeCortex({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      userMessage: 'Why is checkout slow?',
      assistantMessage: 'Redis lock contention on checkout.',
      toolCalls: [
        { tool_id: 'nightshift.sandbox_bash', params: { command: 'esql "FROM traces-*"' } },
      ],
      proposeEdits,
    });

    const [{ transcript }] = proposeEdits.mock.calls[0];
    expect(transcript).toContain(
      '## Tool calls (parameters only)\n- nightshift.sandbox_bash {"command":"esql \\"FROM traces-*\\""}'
    );
    expect(transcript.indexOf('## User')).toBeLessThan(transcript.indexOf('## Tool calls'));
    expect(transcript.indexOf('## Tool calls')).toBeLessThan(transcript.indexOf('## Assistant'));
  });

  it('skips writes when the optimizer proposes nothing', async () => {
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [],
        stats: { total: 0, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn(),
      upsert: jest.fn(),
      corroborate: jest.fn(),
      archive: jest.fn(),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    const telemetry = createTelemetry();
    await optimizeCortex({
      store,
      telemetry,
      logger: loggerMock.create(),
      userMessage: 'hello',
      assistantMessage: 'nothing durable',
      toolCalls: [],
      proposeEdits: async () => ({ edits: [] }),
    });

    expect(store.upsert).not.toHaveBeenCalled();
    expect(telemetry.reportEditsApplied).not.toHaveBeenCalled();
  });
});
