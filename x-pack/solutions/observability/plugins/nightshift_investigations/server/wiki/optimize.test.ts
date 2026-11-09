/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { WIKI_ENTITY_TYPES, WIKI_SECTIONS_BY_TYPE } from '../../common/wiki';
import { WIKI_RELATION_KINDS } from '../../common/wiki_relations';
import type { WikiTelemetry } from '../telemetry';
import {
  applyWikiEdits,
  buildRoundMessages,
  createLlmProposeWikiEdits,
  optimizeWiki,
  renderToolCalls,
} from './optimize';
import type { WikiPageStore } from './page_store';

const createStore = (overrides: Partial<WikiPageStore> = {}): WikiPageStore => ({
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

const createTelemetry = (): jest.Mocked<WikiTelemetry> => ({
  reportHydrated: jest.fn(),
  reportEditsApplied: jest.fn(),
});

describe('applyWikiEdits', () => {
  it('upserts, corroborates, and archives proposed pages', async () => {
    const logger = loggerMock.create();
    const store: WikiPageStore = {
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
    await applyWikiEdits({
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
    expect(store.corroborate).toHaveBeenCalledWith('wiki_service_payments');
    expect(store.archive).toHaveBeenCalledWith('wiki_topic_old-note');
    expect(logger.info.mock.calls.flat().join('\n')).not.toMatch(/checkout|old-note|wiki_service/i);
    expect(telemetry.reportEditsApplied).toHaveBeenCalledWith([
      { action: 'upsert', entityType: 'service' },
      { action: 'corroborate', entityType: 'service' },
      { action: 'archive', entityType: 'topic' },
    ]);
  });

  // Pages are written one at a time, so a mid-loop failure still leaves the earlier edits in the
  // wiki. Dropping their counts would understate writes exactly when a run went wrong.
  it('reports the edits already written when a later edit throws', async () => {
    const store: WikiPageStore = {
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
      applyWikiEdits({
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
    const store: WikiPageStore = {
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
    await applyWikiEdits({
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
    const store: WikiPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [
          {
            id: 'wiki_service_email-service',
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
        id: 'wiki_service_email-service',
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

    await applyWikiEdits({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      edits: [
        {
          action: 'upsert',
          entity_type: 'service',
          slug: 'wiki-service-email-service',
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
    const store: WikiPageStore = {
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
    await applyWikiEdits({
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
      id: 'wiki_service_otel-demo-cart',
      title: 'Cart',
      entity_type: 'service' as const,
      status: 'tentative' as const,
      corroborations: 0,
      updated_at: '2026-09-09T12:00:00.000Z',
      slug: 'otel-demo-cart',
      content: 'Cart uses Redis.',
    };
    const store: WikiPageStore = {
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

    await applyWikiEdits({
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

  describe('which rewrites count as a corroboration', () => {
    const cart = (overrides: Record<string, unknown> = {}) => ({
      id: 'wiki_service_otel-demo-cart',
      title: 'Cart',
      entity_type: 'service' as const,
      status: 'tentative' as const,
      corroborations: 0,
      updated_at: '2026-09-09T12:00:00.000Z',
      slug: 'otel-demo-cart',
      content: 'Cart uses Redis.',
      authored_by: ['conversation-1'],
      ...overrides,
    });

    const rewrite = async ({
      existing,
      roundKind,
      conversationId,
    }: {
      existing: ReturnType<typeof cart>;
      roundKind?: 'initial' | 'follow_up';
      conversationId?: string;
    }) => {
      const store = createStore({
        list: jest.fn().mockResolvedValue({
          pages: [existing],
          stats: { total: 1, established: 0, total_corroborations: 0 },
        }),
        get: jest.fn().mockResolvedValue(existing),
      });
      await applyWikiEdits({
        store,
        telemetry: createTelemetry(),
        logger: loggerMock.create(),
        ...(roundKind ? { roundKind } : {}),
        ...(conversationId ? { provenance: { conversationId } } : {}),
        edits: [
          {
            action: 'upsert',
            entity_type: 'service',
            slug: 'otel-demo-cart',
            title: 'Cart',
            content: 'Cart uses Redis and flagd.',
          },
        ],
      });
      return store;
    };

    it('counts and promotes a rewrite from a different investigation', async () => {
      const store = await rewrite({
        existing: cart(),
        roundKind: 'initial',
        conversationId: 'conversation-2',
      });

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'established', corroborations: 1 })
      );
    });

    it('keeps the status and count of a page a follow-up rewrote', async () => {
      const store = await rewrite({
        existing: cart(),
        roundKind: 'follow_up',
        conversationId: 'conversation-2',
      });

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Cart uses Redis and flagd.',
          status: 'tentative',
          corroborations: 0,
        })
      );
    });

    it('keeps an established page established, at the same count, through a follow-up rewrite', async () => {
      const store = await rewrite({
        existing: cart({ status: 'established', corroborations: 2 }),
        roundKind: 'follow_up',
        conversationId: 'conversation-2',
      });

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'established', corroborations: 2 })
      );
    });

    it('does not let a conversation corroborate a page it wrote itself', async () => {
      const store = await rewrite({
        existing: cart(),
        roundKind: 'initial',
        conversationId: 'conversation-1',
      });

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'tentative', corroborations: 0 })
      );
    });

    const corroborate = async ({
      existing,
      roundKind,
      conversationId,
    }: {
      existing: ReturnType<typeof cart>;
      roundKind: 'initial' | 'follow_up';
      conversationId: string;
    }) => {
      const logger = loggerMock.create();
      const store = createStore({
        list: jest.fn().mockResolvedValue({
          pages: [existing],
          stats: { total: 1, established: 0, total_corroborations: 0 },
        }),
        get: jest.fn().mockResolvedValue(existing),
      });
      await applyWikiEdits({
        store,
        telemetry: createTelemetry(),
        logger,
        roundKind,
        provenance: { conversationId },
        edits: [
          { action: 'corroborate', entity_type: 'service', slug: 'otel-demo-cart', title: 'Cart' },
        ],
      });
      return { store, logger };
    };

    it.each([
      [
        'a follow-up round, even on a page another conversation wrote',
        'follow_up',
        'conversation-2',
      ],
      ['an initial round on a page its own conversation wrote', 'initial', 'conversation-1'],
    ] as const)(
      'does not apply a corroboration from %s',
      async (_name, roundKind, conversationId) => {
        const { store, logger } = await corroborate({
          existing: cart(),
          roundKind,
          conversationId,
        });

        expect(store.corroborate).not.toHaveBeenCalled();
        expect(logger.info.mock.calls.flat().join('\n')).toContain('Skipped corroborating');
      }
    );

    it('applies a corroboration from an initial round of a different investigation', async () => {
      const { store } = await corroborate({
        existing: cart(),
        roundKind: 'initial',
        conversationId: 'conversation-2',
      });

      expect(store.corroborate).toHaveBeenCalledWith('wiki_service_otel-demo-cart', {
        conversationId: 'conversation-2',
      });
    });

    it('revives an archived page as tentative when a follow-up rewrites it', async () => {
      const store = await rewrite({
        existing: cart({ status: 'archived', corroborations: 3 }),
        roundKind: 'follow_up',
        conversationId: 'conversation-2',
      });

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'tentative', corroborations: 3 })
      );
    });
  });

  it('revives a rewritten archived page as tentative without counting it', async () => {
    const existing = {
      id: 'wiki_topic_old-note',
      title: 'Old note',
      entity_type: 'topic' as const,
      status: 'archived' as const,
      corroborations: 3,
      updated_at: '2026-09-09T12:00:00.000Z',
      slug: 'old-note',
      content: 'Stale.',
    };
    const store: WikiPageStore = {
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

    await applyWikiEdits({
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
      id: 'wiki_topic_old-note',
      title: 'Old note',
      entity_type: 'topic' as const,
      status: 'tentative' as const,
      corroborations: 4,
      updated_at: '2026-09-09T12:00:00.000Z',
      slug: 'old-note',
      content: 'Stale.',
    };
    const store: WikiPageStore = {
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

    await applyWikiEdits({
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

  it('omits results for reads of the Wiki and decision-tree files seeded into the sandbox', () => {
    const results = [{ type: 'other', data: { text: 'page body' } }];
    const rendered = renderToolCalls([
      {
        tool_id: 'nightshift_sandbox_view_file',
        params: { file_path: '/workspace/wiki/INDEX.md' },
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

describe('optimizeWiki', () => {
  it('applies LLM proposals from the investigation transcript', async () => {
    const store: WikiPageStore = {
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

    await optimizeWiki({
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
    const store: WikiPageStore = {
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

    await optimizeWiki({
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

    const [{ messages }] = proposeEdits.mock.calls[0];
    expect(messages).toEqual([
      { role: 'user', content: 'Why is checkout slow?' },
      {
        role: 'assistant',
        content: null,
        toolCalls: [
          {
            toolCallId: 'call_0',
            function: {
              name: 'nightshift.sandbox_bash',
              arguments: { command: 'esql "FROM traces-*"' },
            },
          },
        ],
      },
      {
        role: 'tool',
        name: 'nightshift.sandbox_bash',
        toolCallId: 'call_0',
        response: { result: '(no result recorded)' },
      },
      { role: 'assistant', content: 'Redis lock contention on checkout.' },
    ]);
  });

  it('skips writes when the optimizer proposes nothing', async () => {
    const store: WikiPageStore = {
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
    await optimizeWiki({
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

  it.each(['initial', 'follow_up'] as const)(
    'hands the round kind to the model (%s)',
    async (roundKind) => {
      const proposeEdits = jest.fn().mockResolvedValue({ edits: [] });

      await optimizeWiki({
        store: createStore(),
        telemetry: createTelemetry(),
        logger: loggerMock.create(),
        userMessage: 'You missed the cache.',
        assistantMessage: 'Confirmed.',
        toolCalls: [],
        roundKind,
        proposeEdits,
      });

      expect(proposeEdits.mock.calls[0][0].roundKind).toBe(roundKind);
    }
  );

  it('treats a round as initial when no kind is given', async () => {
    const proposeEdits = jest.fn().mockResolvedValue({ edits: [] });

    await optimizeWiki({
      store: createStore(),
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      userMessage: 'Why is checkout slow?',
      assistantMessage: 'Unknown.',
      toolCalls: [],
      proposeEdits,
    });

    expect(proposeEdits.mock.calls[0][0].roundKind).toBe('initial');
  });

  it('replays the earlier request and answer to a follow-up round as turns', async () => {
    const proposeEdits = jest.fn().mockResolvedValue({ edits: [] });

    await optimizeWiki({
      store: createStore(),
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      userMessage: 'You missed the cache.',
      assistantMessage: 'Confirmed.',
      previousUserMessage: 'Why do requests time out?',
      previousAssistantMessage: 'The gateway times out.',
      toolCalls: [],
      roundKind: 'follow_up',
      proposeEdits,
    });

    expect(proposeEdits.mock.calls[0][0].messages).toEqual([
      { role: 'user', content: 'Why do requests time out?' },
      { role: 'assistant', content: 'The gateway times out.' },
      { role: 'user', content: 'You missed the cache.' },
      { role: 'assistant', content: 'Confirmed.' },
    ]);
  });

  it('does not show a previous answer to an initial round', async () => {
    const proposeEdits = jest.fn().mockResolvedValue({ edits: [] });

    await optimizeWiki({
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

    expect(proposeEdits.mock.calls[0][0].messages).toEqual([
      { role: 'user', content: 'Why is checkout slow?' },
      { role: 'assistant', content: 'Unknown.' },
    ]);
  });

  it('tells the optimizer which conversation it is learning from', async () => {
    const proposeEdits = jest.fn().mockResolvedValue({ edits: [] });

    await optimizeWiki({
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

describe('authorship and page content', () => {
  const written = (
    slug: string,
    authoredBy: string[],
    content = '## Dependencies\n- orders-db'
  ) => ({
    id: `wiki_service_${slug}`,
    title: slug,
    entity_type: 'service' as const,
    status: 'tentative' as const,
    corroborations: 0,
    updated_at: '2026-03-02T09:00:00.000Z',
    authored_by: authoredBy,
    content,
    slug,
  });

  it('records the conversation as an author when it creates or rewrites a page', async () => {
    const store = createStore({
      get: jest.fn().mockResolvedValue(written('orders-consumer', ['conversation-0'])),
    });

    await applyWikiEdits({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      provenance: { conversationId: 'conversation-1' },
      edits: [
        {
          action: 'upsert',
          entity_type: 'service',
          slug: 'orders-consumer',
          title: 'orders-consumer',
          content: '## Dependencies\n- orders-db',
        },
      ],
    });

    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ authoredBy: ['conversation-0', 'conversation-1'] })
    );
  });

  it('does not record an author when the page is only corroborated or archived', async () => {
    const store = createStore();

    await applyWikiEdits({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      provenance: { conversationId: 'conversation-1' },
      edits: [
        { action: 'corroborate', entity_type: 'service', slug: 'a', title: 'a' },
        { action: 'archive', entity_type: 'service', slug: 'b', title: 'b' },
      ],
    });

    expect(store.upsert).not.toHaveBeenCalled();
  });

  const pagesStore = () => {
    const own = written('orders-consumer', ['conversation-1']);
    const shared = written('payments', ['conversation-2'], '## Dependencies\n- ledger');
    return createStore({
      list: jest.fn().mockResolvedValue({
        pages: [own, shared],
        stats: { total: 2, established: 0, total_corroborations: 0 },
      }),
      get: jest
        .fn()
        .mockImplementation(async (id: string) => [own, shared].find((page) => page.id === id)),
    });
  };

  it('gives a follow-up the content of the pages its own conversation wrote', async () => {
    const proposeEdits = jest.fn().mockResolvedValue({ edits: [] });

    await optimizeWiki({
      store: pagesStore(),
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      userMessage: 'The cause was not a full orders-db.',
      assistantMessage: 'Agreed, the cause was refuted.',
      previousAssistantMessage: 'The cause was a full orders-db.',
      toolCalls: [],
      roundKind: 'follow_up',
      provenance: { conversationId: 'conversation-1' },
      proposeEdits,
    });

    expect(proposeEdits.mock.calls[0][0].pageBodies).toEqual([
      { slug: 'orders-consumer', entity_type: 'service', content: '## Dependencies\n- orders-db' },
    ]);
  });

  it.each([
    ['follow_up', 'tentative', 0],
    ['initial', 'established', 1],
  ] as const)(
    "a %s round that rewrites another conversation's page leaves it %s at %sx",
    async (roundKind, status, count) => {
      const store = pagesStore();

      await optimizeWiki({
        store,
        telemetry: createTelemetry(),
        logger: loggerMock.create(),
        userMessage: 'The payments service also depends on the ledger.',
        assistantMessage: 'Noted.',
        toolCalls: [],
        roundKind,
        provenance: { conversationId: 'conversation-1' },
        proposeEdits: jest.fn().mockResolvedValue({
          edits: [
            {
              action: 'upsert',
              entity_type: 'service',
              slug: 'payments',
              title: 'payments',
              content: '## Dependencies\n- ledger\n- orders-db',
            },
          ],
        }),
      });

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'payments', status, corroborations: count })
      );
    }
  );

  const optimizeWith = async ({
    store,
    roundKind,
    userMessage,
  }: {
    store: WikiPageStore;
    roundKind: 'initial' | 'follow_up';
    userMessage: string;
  }) => {
    const proposeEdits = jest.fn().mockResolvedValue({ edits: [] });
    await optimizeWiki({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      userMessage,
      assistantMessage: 'ok',
      toolCalls: [],
      roundKind,
      provenance: { conversationId: 'conversation-1' },
      proposeEdits,
    });
    return proposeEdits.mock.calls[0][0];
  };

  it('loads no page content when nothing is named and nothing was written by this conversation', async () => {
    const store = pagesStore();

    const input = await optimizeWith({ store, roundKind: 'initial', userMessage: 'hello' });

    expect(input.pageBodies).toBeUndefined();
    expect(store.get).not.toHaveBeenCalled();
  });

  it('gives a follow-up the pages this conversation wrote, so a correction can edit them', async () => {
    const input = await optimizeWith({
      store: pagesStore(),
      roundKind: 'follow_up',
      userMessage: 'hello',
    });

    expect(input.pageBodies).toEqual([
      { slug: 'orders-consumer', entity_type: 'service', content: '## Dependencies\n- orders-db' },
    ]);
  });

  it('gives any round the content of a page the transcript names, whoever wrote it', async () => {
    const input = await optimizeWith({
      store: pagesStore(),
      roundKind: 'initial',
      userMessage: 'Why is the payments service slow?',
    });

    expect(input.pageBodies).toEqual([
      { slug: 'payments', entity_type: 'service', content: '## Dependencies\n- ledger' },
    ]);
  });

  it('does not match a short slug against unrelated words', async () => {
    const short = written('db', ['conversation-2']);
    const store = createStore({
      list: jest.fn().mockResolvedValue({
        pages: [short],
        stats: { total: 1, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn().mockResolvedValue(short),
    });

    const input = await optimizeWith({
      store,
      roundKind: 'initial',
      userMessage: 'The db is slow',
    });

    expect(input.pageBodies).toBeUndefined();
  });

  it('leaves out archived pages and caps how many pages it loads', async () => {
    const many = Array.from({ length: 12 }, (_, index) => written(`service-${index}`, []));
    const archived = { ...written('service-archived', []), status: 'archived' as const };
    const all = [archived, ...many];
    const store = createStore({
      list: jest.fn().mockResolvedValue({
        pages: all,
        stats: { total: all.length, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn().mockImplementation(async (id: string) => all.find((page) => page.id === id)),
    });

    const input = await optimizeWith({
      store,
      roundKind: 'initial',
      userMessage: all.map((page) => page.slug).join(' '),
    });

    expect(input.pageBodies).toHaveLength(8);
    expect(input.pageBodies.map(({ slug }: { slug: string }) => slug)).not.toContain(
      'service-archived'
    );
  });
});

describe('applyWikiEdits empty sections', () => {
  it('does not write a heading that has nothing under it', async () => {
    const store = createStore();

    await applyWikiEdits({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      edits: [
        {
          action: 'upsert',
          entity_type: 'integration',
          slug: 'logging-eu-west',
          title: 'logging-eu-west',
          content:
            '## Overview\nA remote.\n\n## Tool failures\n\n## Common pitfalls\n- Add a time filter.',
        },
      ],
    });

    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '## Overview\nA remote.\n\n## Common pitfalls\n- Add a time filter.',
      })
    );
  });
});

describe('applyWikiEdits ontology cleanup', () => {
  const ontologyContent = [
    '## Nodes',
    '- warpstream-agent',
    '- autoops-bootstrap',
    '- telemetry-connector',
    '',
    '## Relations',
    '```',
    'autoops-bootstrap -> warpstream-agent : depends_on',
    'warpstream-agent -> telemetry-connector : publishes_to',
    'warpstream-agent -> autoops-bootstrap : depends_on',
    'warpstream-agent -> warpstream-agent : calls',
    '```',
  ].join('\n');

  const integrationPage: {
    id: string;
    title: string;
    description?: string;
    entity_type: 'integration';
    status: 'established';
    corroborations: number;
    updated_at: string;
  } = {
    id: 'wiki_integration_telemetry-connector',
    title: 'telemetry-connector',
    entity_type: 'integration',
    status: 'established',
    corroborations: 2,
    updated_at: '2026-03-02T09:00:00.000Z',
  };

  const apply = async ({
    catalog,
    extraEdits = [],
  }: {
    catalog: Array<typeof integrationPage>;
    extraEdits?: Parameters<typeof applyWikiEdits>[0]['edits'];
  }) => {
    const logger = loggerMock.create();
    const store = createStore({
      list: jest.fn().mockResolvedValue({
        pages: catalog,
        stats: { total: catalog.length, established: 0, total_corroborations: 0 },
      }),
    });
    await applyWikiEdits({
      store,
      telemetry: createTelemetry(),
      logger,
      edits: [
        {
          action: 'upsert',
          entity_type: 'ontology',
          slug: 'autoops-kafka-ingestion',
          title: 'AutoOps Kafka ingestion',
          content: ontologyContent,
        },
        ...extraEdits,
      ],
    });
    return { store, logger };
  };

  const writtenContent = (store: WikiPageStore): string =>
    (store.upsert as jest.Mock).mock.calls.find(
      ([page]) => page.slug === 'autoops-kafka-ingestion'
    )[0].content;

  it('drops edges to an integration page, self edges and reversed pairs before writing', async () => {
    const { store, logger } = await apply({ catalog: [integrationPage] });

    const content = writtenContent(store);
    expect(content).toContain('autoops-bootstrap -> warpstream-agent : depends_on');
    expect(content).not.toContain('telemetry-connector');
    expect(content).not.toContain('warpstream-agent -> autoops-bootstrap');
    expect(content).not.toContain('warpstream-agent -> warpstream-agent');
    expect(logger.info.mock.calls.flat().join('\n')).toContain('excluded');
  });

  it('also excludes an integration that the same run creates', async () => {
    const { store } = await apply({
      catalog: [],
      extraEdits: [
        {
          action: 'upsert',
          entity_type: 'integration',
          slug: 'telemetry-connector',
          title: 'telemetry-connector',
          content: '## Overview\nTelemetry cluster.',
        },
      ],
    });

    expect(writtenContent(store)).not.toContain('telemetry-connector');
  });

  it('keeps edges to an integration that is not a telemetry store', async () => {
    const { store } = await apply({
      catalog: [
        {
          ...integrationPage,
          id: 'wiki_integration_telemetry-connector',
          title: 'orders database',
          description: 'Postgres that the checkout flow reads orders from',
        },
      ],
    });

    expect(writtenContent(store)).toContain(
      'warpstream-agent -> telemetry-connector : publishes_to'
    );
  });

  it('keeps a node that no page declares as an integration', async () => {
    const { store } = await apply({ catalog: [] });

    expect(writtenContent(store)).toContain(
      'warpstream-agent -> telemetry-connector : publishes_to'
    );
  });
});

describe('applyWikiEdits non-temporal check', () => {
  it('skips an upsert that carries a date, an id or a count and applies the rest', async () => {
    const logger = loggerMock.create();
    const store = createStore();

    await applyWikiEdits({
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
    expect(warning).toContain('iso_timestamp "2026-03-02"');
    expect(warning).not.toContain('5,944');
  });

  it('keeps a page whose only issue is how many replicas run, and says so', async () => {
    const logger = loggerMock.create();
    const store = createStore();

    await applyWikiEdits({
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

    await applyWikiEdits({
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

  it.each([
    [
      'a configured retry limit',
      'The client gives up after 3 retries.',
      'counted_quantity "3 retries"',
    ],
    [
      'a quoted error message',
      'The API answers "The requested resource is currently unavailable".',
      'relative_time "currently"',
    ],
    [
      'a batch size',
      'Bulk requests carry 1000 documents per batch.',
      'counted_quantity "1000 documents"',
    ],
  ])('keeps a page with %s, and says what it matched', async (_name, content, reported) => {
    const logger = loggerMock.create();
    const store = createStore();

    await applyWikiEdits({
      store,
      telemetry: createTelemetry(),
      logger,
      edits: [
        {
          action: 'upsert',
          entity_type: 'service',
          slug: 'checkout-api',
          title: 'checkout-api',
          content: `## Failure modes\n${content}`,
        },
      ],
    });

    expect(store.upsert).toHaveBeenCalledWith(expect.objectContaining({ slug: 'checkout-api' }));
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info.mock.calls.flat().join('\n')).toContain(reported);
  });

  it('still corroborates and archives, which carry no new content', async () => {
    const store = createStore();

    await applyWikiEdits({
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

describe('createLlmProposeWikiEdits prompt', () => {
  const run = async (input: Parameters<ReturnType<typeof createLlmProposeWikiEdits>>[0]) => {
    const output = jest.fn().mockResolvedValue({ output: { edits: [] } });
    await createLlmProposeWikiEdits({
      inferenceClient: { output } as unknown as BoundInferenceClient,
    })(input);
    return output.mock.calls[0][0] as { system: string; input: string };
  };

  it('asks for the sections the shared list defines, for every entity type', async () => {
    const { system } = await run({ messages: [], roundKind: 'initial', catalog: [] });

    for (const entityType of WIKI_ENTITY_TYPES) {
      const sections = WIKI_SECTIONS_BY_TYPE[entityType];
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
    const { system } = await run({ messages: [], roundKind: 'initial', catalog: [] });

    expect(system).toContain('"5,944 errors"');
    expect(system).toContain('number of pods, replicas, nodes or instances');
    expect(system).toContain('HTTP status codes ("403 errors on registration")');
  });

  it('describes the ontology relation format and its kinds', async () => {
    const { system } = await run({ messages: [], roundKind: 'initial', catalog: [] });

    expect(system).toContain('`source -> target : kind`');
    for (const kind of WIKI_RELATION_KINDS) {
      expect(system).toContain(kind);
    }
  });

  it('explains how to treat each kind of round and how to record tool failures', async () => {
    const { system } = await run({ messages: [], roundKind: 'initial', catalog: [] });

    expect(system).toContain('follow_up —');
    expect(system).not.toContain('alert_recovery');
    expect(system).toContain('A follow-up never confirms a page');
    expect(system).toContain('## Tool failures');
    expect(system).toContain('A single typo is not a failure signature');
    expect(system).toContain('recorded nowhere on the page');
  });

  it('marks the catalog pages the current investigation wrote', async () => {
    const page = {
      id: 'wiki_service_orders-consumer',
      title: 'orders-consumer',
      entity_type: 'service' as const,
      status: 'tentative' as const,
      corroborations: 0,
      updated_at: '2026-03-02T09:00:00.000Z',
    };

    const { input } = await run({
      messages: [],
      roundKind: 'initial',
      currentConversationId: 'conversation-1',
      catalog: [
        { ...page, conversation_id: 'conversation-1', authored_by: ['conversation-1'] },
        { ...page, id: 'wiki_service_payments', title: 'payments', conversation_id: 'other' },
      ],
    });

    expect(input).toContain(
      'slug=orders-consumer | service | tentative | orders-consumer (0x) [this investigation]'
    );
    expect(input).toContain('slug=payments | service | tentative | payments (0x)\n');
    expect(input).not.toContain('payments (0x) [this investigation]');
  });

  it('keeps the marker on a page another conversation only corroborated afterwards', async () => {
    const { input } = await run({
      messages: [],
      roundKind: 'initial',
      currentConversationId: 'conversation-1',
      catalog: [
        {
          id: 'wiki_service_orders-consumer',
          title: 'orders-consumer',
          entity_type: 'service',
          status: 'tentative',
          corroborations: 1,
          updated_at: '2026-03-02T09:00:00.000Z',
          conversation_id: 'conversation-2',
          authored_by: ['conversation-1'],
        },
      ],
    });

    expect(input).toContain('orders-consumer (1x) [this investigation]');
  });

  it('does not mark a page that this conversation only corroborated', async () => {
    const { input } = await run({
      messages: [],
      roundKind: 'initial',
      currentConversationId: 'conversation-1',
      catalog: [
        {
          id: 'wiki_service_orders-consumer',
          title: 'orders-consumer',
          entity_type: 'service',
          status: 'tentative',
          corroborations: 1,
          updated_at: '2026-03-02T09:00:00.000Z',
          conversation_id: 'conversation-1',
          authored_by: ['conversation-2'],
        },
      ],
    });

    expect(input).not.toContain('[this investigation]');
  });

  it('shows the content of the pages the round may rewrite', async () => {
    const { input } = await run({
      messages: [],
      roundKind: 'initial',
      catalog: [],
      pageBodies: [
        {
          slug: 'orders-consumer',
          entity_type: 'service',
          content: '## Dependencies\n- orders-db',
        },
      ],
    });

    expect(input).toContain('Existing page content:\n### service/orders-consumer');
    expect(input).toContain('- orders-db');
  });

  it('leaves out the section when there are no such pages', async () => {
    const { input } = await run({ messages: [], roundKind: 'initial', catalog: [] });

    expect(input).not.toContain('Existing page content');
  });

  it('tells the model to start a rewrite from the existing content and not to drop knowledge', async () => {
    const { system } = await run({ messages: [], roundKind: 'initial', catalog: [] });

    expect(system).toContain('An "upsert" replaces the whole page');
    expect(system).toContain('start from it');
    expect(system).toContain('never drop a section it has');
  });

  it('asks for slugs as relation nodes and says which way an edge points', async () => {
    const { system } = await run({ messages: [], roundKind: 'initial', catalog: [] });

    expect(system).toContain('page slug exactly as the catalog shows it');
    expect(system).toContain('"A reads_from B" as "A pulls data from B"');
    expect(system).toContain('never add a telemetry connector as a node');
    expect(system).toContain('State each edge once');
  });
});

describe('buildRoundMessages', () => {
  const base = { userMessage: 'Why is checkout slow?', assistantMessage: 'Lock contention.' };

  it('turns each tool call into an assistant call and a tool result, in order', () => {
    const messages = buildRoundMessages({
      ...base,
      toolCalls: [
        {
          tool_id: 'nightshift.sandbox_bash',
          tool_call_id: 'abc',
          params: { command: 'ls' },
          results: [{ type: 'other', data: { stdout: 'a.txt' } }],
        },
      ],
    });

    expect(messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'tool',
      'assistant',
    ]);
    expect(messages[1]).toMatchObject({
      toolCalls: [{ toolCallId: 'abc', function: { name: 'nightshift.sandbox_bash' } }],
    });
    expect(messages[2]).toMatchObject({ toolCallId: 'abc', response: { result: 'stdout: a.txt' } });
  });

  it('marks a failed result so the model can tell it from data', () => {
    const messages = buildRoundMessages({
      ...base,
      toolCalls: [
        { tool_id: 't', results: [{ type: 'error', data: { message: 'no such remote' } }] },
      ],
    });

    expect(messages[2]).toMatchObject({ response: { result: 'error: message: no such remote' } });
  });

  it('gives every call its own id so each result pairs with one call', () => {
    const messages = buildRoundMessages({
      ...base,
      toolCalls: [
        { tool_id: 't', tool_call_id: 'same' },
        { tool_id: 't', tool_call_id: 'same' },
        { tool_id: 't' },
      ],
    });
    const callIds = messages.flatMap((message) =>
      message.role === 'assistant' && message.toolCalls ? [message.toolCalls[0].toolCallId] : []
    );
    const resultIds = messages.flatMap((message) =>
      message.role === 'tool' ? [message.toolCallId] : []
    );

    expect(new Set(callIds).size).toBe(3);
    expect(resultIds).toEqual(callIds);
  });

  it('keeps far more of a result than the text dump does', () => {
    const messages = buildRoundMessages({
      ...base,
      toolCalls: [
        { tool_id: 't', results: [{ type: 'other', data: { stdout: 'x'.repeat(7_000) } }] },
      ],
    });

    expect(JSON.stringify(messages[2])).toContain('x'.repeat(5_000));
  });

  it('leaves out the content of a file Nightshift seeded itself', () => {
    const messages = buildRoundMessages({
      ...base,
      toolCalls: [
        {
          tool_id: 'nightshift_sandbox_view_file',
          params: { file_path: '/workspace/wiki/INDEX.md' },
          results: [{ type: 'other', data: { stdout: 'SEEDED CONTENT' } }],
        },
      ],
    });

    expect(JSON.stringify(messages)).not.toContain('SEEDED CONTENT');
  });

  it('stops at the budget and says how many calls it left out, keeping calls and results paired', () => {
    const calls = Array.from({ length: 30 }, (_, index) => ({
      tool_id: 't',
      tool_call_id: `c${index}`,
      results: [{ type: 'other', data: { stdout: 'y'.repeat(7_000) } }],
    }));
    const messages = buildRoundMessages({ ...base, toolCalls: calls });
    const callCount = messages.filter(
      (message) => message.role === 'assistant' && message.toolCalls
    ).length;

    expect(callCount).toBeLessThan(30);
    expect(callCount).toBe(messages.filter((message) => message.role === 'tool').length);
    expect(JSON.stringify(messages)).toContain('more tool calls omitted');
    expect(messages[messages.length - 1]).toEqual({
      role: 'assistant',
      content: 'Lock contention.',
    });
  });

  it('puts a placeholder where an earlier request is unknown', () => {
    const messages = buildRoundMessages({
      ...base,
      toolCalls: [],
      roundKind: 'follow_up',
      previousAssistantMessage: 'Earlier answer.',
    });

    expect(messages.slice(0, 2)).toEqual([
      { role: 'user', content: '(the earlier request)' },
      { role: 'assistant', content: 'Earlier answer.' },
    ]);
  });
});

describe('createLlmProposeWikiEdits messages', () => {
  it('sends the round as previous messages and keeps the rest for the final human message', async () => {
    const output = jest.fn().mockResolvedValue({ output: { edits: [] } });
    const messages = buildRoundMessages({
      userMessage: 'q',
      assistantMessage: 'a',
      toolCalls: [],
    });

    await createLlmProposeWikiEdits({
      inferenceClient: { output } as unknown as BoundInferenceClient,
    })({
      messages,
      roundKind: 'follow_up',
      catalog: [],
      pageBodies: [{ slug: 'orders-db', entity_type: 'service', content: 'body' }],
    });

    const call = output.mock.calls[0][0];
    expect(call.previousMessages).toBe(messages);
    expect(call.input).toContain('Round kind: follow_up');
    expect(call.input).toContain('Existing pages:');
    expect(call.input).toContain('### service/orders-db');
    expect(call.input.endsWith('Propose the Wiki edits for the round above.')).toBe(true);
    expect(call.input).not.toContain('Investigation transcript');
  });
});
