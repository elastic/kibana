/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { CORTEX_ENTITY_TYPES, CORTEX_SECTIONS_BY_TYPE } from '../../common/cortex';
import { CORTEX_RELATION_KINDS } from '../../common/cortex_relations';
import type { CortexTelemetry } from '../telemetry';
import {
  applyCortexEdits,
  createLlmProposeCortexEdits,
  optimizeCortex,
  renderToolCalls,
} from './optimize';
import type { CortexPageStore } from './page_store';

const createStore = (overrides: Partial<CortexPageStore> = {}): CortexPageStore => ({
  list: jest.fn().mockResolvedValue({
    pages: [],
    stats: { total: 0, established: 0, total_corroborations: 0 },
  }),
  get: jest.fn().mockResolvedValue(undefined),
  upsert: jest.fn().mockResolvedValue({}),
  create: jest.fn(),
  corroborate: jest.fn().mockResolvedValue({}),
  archive: jest.fn().mockResolvedValue({}),
  pruneDuplicates: jest.fn().mockResolvedValue(0),
  ...overrides,
});

const createTelemetry = (): jest.Mocked<CortexTelemetry> => ({
  reportHydrated: jest.fn(),
  reportEditsApplied: jest.fn(),
});

describe('applyCortexEdits', () => {
  it('upserts, corroborates, and archives proposed pages', async () => {
    const logger = loggerMock.create();
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [],
        stats: { total: 0, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue({}),
      create: jest.fn(),
      corroborate: jest.fn().mockResolvedValue({}),
      archive: jest.fn().mockResolvedValue({}),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    const telemetry = createTelemetry();
    await applyCortexEdits({
      store,
      telemetry,
      logger,
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
    expect(logger.info.mock.calls.flat().join('\n')).not.toMatch(
      /checkout|old-note|cortex_service/i
    );
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
      create: jest.fn(),
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
      create: jest.fn(),
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
      create: jest.fn(),
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
      create: jest.fn(),
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
      create: jest.fn(),
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
      create: jest.fn(),
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

  it('does not promote a page revived earlier in the same run', async () => {
    const revived = {
      id: 'cortex_topic_old-note',
      title: 'Old note',
      entity_type: 'topic' as const,
      status: 'tentative' as const,
      corroborations: 4,
      updated_at: '2026-09-09T12:00:00.000Z',
      slug: 'old-note',
      content: 'Stale.',
    };
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [{ ...revived, status: 'archived' as const, corroborations: 3 }],
        stats: { total: 1, established: 0, total_corroborations: 3 },
      }),
      get: jest.fn().mockResolvedValue(revived),
      upsert: jest.fn().mockResolvedValue({}),
      create: jest.fn(),
      corroborate: jest.fn().mockResolvedValue(revived),
      archive: jest.fn(),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    await applyCortexEdits({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      edits: [
        { action: 'corroborate', entity_type: 'topic', slug: 'old-note', title: 'Old note' },
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
      expect.objectContaining({ status: 'tentative', corroborations: 4 })
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

  it('bounds large strings and arrays inside the parameters', () => {
    const line = renderToolCalls([
      {
        tool_id: 'nightshift.sandbox_write_file',
        params: { path: '/workspace/a', content: 'x'.repeat(100_000), lines: Array(1_000).fill(1) },
      },
    ]);

    expect(line.length).toBeLessThan(1_100);
    expect(line).toContain('"path":"/workspace/a"');
  });

  it('renders a bounded result line under a call whose results are known', () => {
    const rendered = renderToolCalls([
      {
        tool_id: 'nightshift.sandbox_bash',
        params: { command: 'esql "FROM logs-*"' },
        results: [{ type: 'other', data: { stdout: `pool exhausted ${'x'.repeat(10_000)}` } }],
      },
    ]);

    const [callLine, resultLine] = rendered.split('\n');
    expect(callLine).toBe('- nightshift.sandbox_bash {"command":"esql \\"FROM logs-*\\""}');
    expect(resultLine).toMatch(/^ {2}result: stdout: pool exhausted x+$/);
    expect(resultLine.length).toBeLessThan(2_100);
  });

  it('renders string result fields raw instead of JSON-escaped', () => {
    const rendered = renderToolCalls([
      {
        tool_id: 'nightshift.sandbox_bash',
        params: { command: 'esql "FROM logs-*"' },
        results: [{ type: 'other', data: { stdout: '{\n  "values": [["a"]]\n}', exit_code: 0 } }],
      },
    ]);

    expect(rendered).toContain('  result: stdout: {\n  "values": [["a"]]\n}\nexit_code: 0');
  });

  it('omits results for reads of the Cortex and decision-tree files seeded into the sandbox', () => {
    const results = [{ type: 'other', data: { text: 'page body' } }];
    const rendered = renderToolCalls([
      {
        tool_id: 'nightshift_sandbox_view_file',
        params: { file_path: '/workspace/cortex/INDEX.md' },
        results,
      },
      {
        tool_id: 'nightshift_sandbox_view_file',
        params: { file_path: 'decision-trees/monitors.md' },
        results,
      },
      {
        tool_id: 'nightshift_sandbox_view_file',
        params: { file_path: '/workspace/notes/errors.txt' },
        results,
      },
    ]);

    expect(rendered.match(/result:/g)).toHaveLength(1);
    expect(rendered).toContain(
      '- nightshift_sandbox_view_file {"file_path":"/workspace/notes/errors.txt"}\n  result: text: page body'
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
      create: jest.fn(),
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
      create: jest.fn(),
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
      '## Tool calls\n- nightshift.sandbox_bash {"command":"esql \\"FROM traces-*\\""}'
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
      create: jest.fn(),
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

  it.each([
    ['initial', 'Kind: initial'],
    ['follow_up', 'Kind: follow_up'],
    ['alert_recovery', 'Kind: alert_recovery'],
  ] as const)('opens the transcript with the round kind (%s)', async (roundKind, line) => {
    const proposeEdits = jest.fn().mockResolvedValue({ edits: [] });

    await optimizeCortex({
      store: createStore(),
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      userMessage: 'You missed the cache.',
      assistantMessage: 'Confirmed.',
      toolCalls: [],
      roundKind,
      proposeEdits,
    });

    expect(proposeEdits.mock.calls[0][0].transcript.startsWith(`## Round\n${line}\n`)).toBe(true);
  });

  it('treats a round as initial when no kind is given', async () => {
    const proposeEdits = jest.fn().mockResolvedValue({ edits: [] });

    await optimizeCortex({
      store: createStore(),
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      userMessage: 'Why is checkout slow?',
      assistantMessage: 'Unknown.',
      toolCalls: [],
      proposeEdits,
    });

    expect(proposeEdits.mock.calls[0][0].transcript).toContain('Kind: initial');
  });

  it.each(['follow_up', 'alert_recovery'] as const)(
    'shows the previous answer to a %s round',
    async (roundKind) => {
      const proposeEdits = jest.fn().mockResolvedValue({ edits: [] });

      await optimizeCortex({
        store: createStore(),
        telemetry: createTelemetry(),
        logger: loggerMock.create(),
        userMessage: 'You missed the cache.',
        assistantMessage: 'Confirmed.',
        previousAssistantMessage: 'The gateway times out.',
        toolCalls: [],
        roundKind,
        proposeEdits,
      });

      const { transcript } = proposeEdits.mock.calls[0][0];
      expect(transcript).toContain('## Previous answer\nThe gateway times out.');
      expect(transcript.indexOf('## Previous answer')).toBeLessThan(transcript.indexOf('## User'));
    }
  );

  it('does not show a previous answer to an initial round', async () => {
    const proposeEdits = jest.fn().mockResolvedValue({ edits: [] });

    await optimizeCortex({
      store: createStore(),
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      userMessage: 'Why is checkout slow?',
      assistantMessage: 'Unknown.',
      previousAssistantMessage: 'Left over from elsewhere.',
      toolCalls: [],
      roundKind: 'initial',
      proposeEdits,
    });

    expect(proposeEdits.mock.calls[0][0].transcript).not.toContain('## Previous answer');
  });

  it('tells the optimizer which conversation it is learning from', async () => {
    const proposeEdits = jest.fn().mockResolvedValue({ edits: [] });

    await optimizeCortex({
      store: createStore(),
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      userMessage: 'hello',
      assistantMessage: 'nothing durable',
      toolCalls: [],
      provenance: { conversationId: 'conversation-1', roundId: 'round-1' },
      proposeEdits,
    });

    expect(proposeEdits).toHaveBeenCalledWith(
      expect.objectContaining({ currentConversationId: 'conversation-1' })
    );
  });
});

describe('applyCortexEdits non-temporal check', () => {
  it('skips an upsert that carries a date, an id or a count and applies the rest', async () => {
    const logger = loggerMock.create();
    const store = createStore();

    await applyCortexEdits({
      store,
      telemetry: createTelemetry(),
      logger,
      edits: [
        {
          action: 'upsert',
          entity_type: 'service',
          slug: 'checkout-api',
          title: 'checkout-api',
          content: '## Failure modes\n- Failed on 2026-03-02 after 5,944 errors.',
        },
        {
          action: 'upsert',
          entity_type: 'service',
          slug: 'session-cache',
          title: 'session-cache',
          content: '## Failure modes\n- Evicts sessions under memory pressure.',
        },
      ],
    });

    expect(store.upsert).toHaveBeenCalledTimes(1);
    expect(store.upsert).toHaveBeenCalledWith(expect.objectContaining({ slug: 'session-cache' }));
    const warning = logger.warn.mock.calls.flat().join('\n');
    expect(warning).toContain('service/checkout-api');
    expect(warning).toContain('iso_timestamp');
    expect(warning).not.toContain('5,944');
  });

  it('keeps a page whose only issue is how many replicas run, and says so', async () => {
    const logger = loggerMock.create();
    const store = createStore();

    await applyCortexEdits({
      store,
      telemetry: createTelemetry(),
      logger,
      edits: [
        {
          action: 'upsert',
          entity_type: 'service',
          slug: 'eis-gateway',
          title: 'eis-gateway',
          content:
            '## Telemetry\nPods are named `eis-gateway-<zone>-<hash>`; 9 pods in one region.',
        },
      ],
    });

    expect(store.upsert).toHaveBeenCalledWith(expect.objectContaining({ slug: 'eis-gateway' }));
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info.mock.calls.flat().join('\n')).toContain('replica_count');
  });

  it('keeps a runbook whose title names an HTTP status code', async () => {
    const store = createStore();

    await applyCortexEdits({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      edits: [
        {
          action: 'upsert',
          entity_type: 'runbook',
          slug: 'autoops-403-new-projects',
          title: 'AutoOps 403 errors for newly created projects',
          content: '## Trigger\nUsers get 403 errors opening AutoOps.',
        },
      ],
    });

    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'autoops-403-new-projects' })
    );
  });

  it('still skips a page that mixes a replica count with a count of events', async () => {
    const store = createStore();

    await applyCortexEdits({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      edits: [
        {
          action: 'upsert',
          entity_type: 'service',
          slug: 'checkout-api',
          title: 'checkout-api',
          content: '## Failure modes\n9 pods restarted after 5,944 errors.',
        },
      ],
    });

    expect(store.upsert).not.toHaveBeenCalled();
  });

  it('still corroborates and archives, which carry no new content', async () => {
    const store = createStore();

    await applyCortexEdits({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      edits: [
        { action: 'corroborate', entity_type: 'service', slug: 'payments', title: 'Payments' },
        { action: 'archive', entity_type: 'topic', slug: 'old-note', title: 'Old note' },
      ],
    });

    expect(store.corroborate).toHaveBeenCalled();
    expect(store.archive).toHaveBeenCalled();
  });
});

describe('renderToolCalls errors', () => {
  it('marks a result Agent Builder typed as an error', () => {
    const rendered = renderToolCalls([
      {
        tool_id: 'nightshift.sandbox_bash',
        params: { command: 'q "FROM x"' },
        results: [{ type: 'error', data: { message: 'no such remote cluster' } }],
      },
    ]);

    expect(rendered).toContain('result: error: message: no such remote cluster');
  });

  it('leaves a successful result unmarked', () => {
    const rendered = renderToolCalls([
      {
        tool_id: 'nightshift.sandbox_bash',
        params: { command: 'q "FROM x"' },
        results: [{ type: 'other', data: { stdout: 'ok' } }],
      },
    ]);

    expect(rendered).not.toContain('error:');
  });
});

describe('createLlmProposeCortexEdits prompt', () => {
  const run = async (input: Parameters<ReturnType<typeof createLlmProposeCortexEdits>>[0]) => {
    const output = jest.fn().mockResolvedValue({ output: { edits: [] } });
    await createLlmProposeCortexEdits({
      inferenceClient: { output } as unknown as BoundInferenceClient,
    })(input);
    return output.mock.calls[0][0] as { system: string; input: string };
  };

  it('asks for the sections the shared list defines, for every entity type', async () => {
    const { system } = await run({ transcript: '## Round\nKind: initial', catalog: [] });

    for (const entityType of CORTEX_ENTITY_TYPES) {
      const sections = CORTEX_SECTIONS_BY_TYPE[entityType];
      const line = system
        .split('\n')
        .find((candidate) => candidate.startsWith(`- ${entityType} —`));
      expect(line).toBeDefined();
      for (const section of sections) {
        expect(line).toContain(`## ${section}`);
      }
    }
  });

  it('says what the page check rejects and what is fine to write', async () => {
    const { system } = await run({ transcript: '', catalog: [] });

    expect(system).toContain('"5,944 errors"');
    expect(system).toContain('number of pods, replicas, nodes or instances');
    expect(system).toContain('HTTP status codes ("403 errors on registration")');
  });

  it('describes the ontology relation format and its kinds', async () => {
    const { system } = await run({ transcript: '', catalog: [] });

    expect(system).toContain('`source -> target : kind`');
    for (const kind of CORTEX_RELATION_KINDS) {
      expect(system).toContain(kind);
    }
  });

  it('explains how to treat each kind of round and how to record tool failures', async () => {
    const { system } = await run({ transcript: '', catalog: [] });

    expect(system).toContain('follow_up —');
    expect(system).toContain('alert_recovery —');
    expect(system).toContain('## Tool failures');
    expect(system).toContain('A single typo is not a failure signature');
  });

  it('marks the catalog pages the current investigation wrote', async () => {
    const page = {
      id: 'cortex_service_orders-consumer',
      title: 'orders-consumer',
      entity_type: 'service' as const,
      status: 'tentative' as const,
      corroborations: 0,
      updated_at: '2026-03-02T09:00:00.000Z',
    };

    const { input } = await run({
      transcript: '',
      currentConversationId: 'conversation-1',
      catalog: [
        { ...page, conversation_id: 'conversation-1' },
        { ...page, id: 'cortex_service_payments', title: 'payments', conversation_id: 'other' },
      ],
    });

    expect(input).toContain(
      'slug=orders-consumer | service | tentative | orders-consumer (0x) [this investigation]'
    );
    expect(input).toContain('slug=payments | service | tentative | payments (0x)\n');
    expect(input).not.toContain('payments (0x) [this investigation]');
  });
});
