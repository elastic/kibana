/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';

import type { ResolvedRepository } from '../models/repository_codec';
import type { GrepMatch, GrepRequest, SourceReader } from '../ports/source_reader';
import {
  discoverWrapperCallCandidates,
  MAX_LOGGING_WRAPPERS,
  MAX_WRAPPER_CALL_CANDIDATES,
} from './discover_wrapper_calls';
import type { LoggingWrapper } from './logging_wrappers';

const repository: ResolvedRepository = {
  commitSha: 'a'.repeat(40),
  repository: 'acme/agents',
  requestedRevision: 'main',
};

/** A small repository whose files are searched with the real `grep -E`. */
const files: Readonly<Record<string, readonly string[]>> = {
  'src/acp-runtime.ts': [
    'telemetry?.event(`acp.retry.${recovery.phase}`, {});',
    'turn.event("acp.retry.failed", {});',
  ],
  'src/slack.ts': ['app.event("app_mention", handler);', 'emitter.emit("close");'],
  'src/telemetry.ts': [
    'const emit = (name: string) =>',
    '  logger.emit({ body: name });',
    'emit("slack.turn.failed", {});',
    'return {',
    '  event: emit,',
    '};',
  ],
  'test/telemetry.test.ts': ['emit("test.only");'],
};

/** Runs one request against `files` the way `git grep -E` would. */
const grepFiles = ({ caseSensitive, path, pattern }: GrepRequest): readonly GrepMatch[] =>
  Object.entries(files)
    .filter(([file]) => path === undefined || file === path)
    .flatMap(([file, lines]) =>
      lines.flatMap((text, index) =>
        spawnSync('grep', ['-E', ...(caseSensitive === true ? [] : ['-i']), pattern], {
          encoding: 'utf8',
          input: text,
        }).status === 0
          ? [{ line: index + 1, path: file, text }]
          : []
      )
    );

const readerFor = (overrides: Partial<SourceReader> = {}): jest.Mocked<SourceReader> => {
  const reader: SourceReader = {
    grep: async (request) => ({ items: [...grepFiles(request)], status: 'complete' }),
    listSourcePage: async () => ({ items: [], status: 'complete' }),
    readWindow: async ({ endLine, path, startLine }) => {
      const lines = files[path] ?? [];
      const last = Math.min(endLine, lines.length);
      return {
        status: 'success',
        value: { endLine: last, lines: lines.slice(startLine - 1, last), path, startLine },
      };
    },
    ...overrides,
  };
  return {
    grep: jest.fn(reader.grep),
    listSourcePage: jest.fn(reader.listSourcePage),
    readWindow: jest.fn(reader.readWindow),
  };
};

const wrapper: LoggingWrapper = {
  evidence: [
    {
      excerpt: 'const emit = (name: string) =>\n  logger.emit({ body: name });',
      line: 2,
      path: 'src/telemetry.ts',
    },
  ],
  forms: { bare: true, member: false },
  name: 'emit',
  path: 'src/telemetry.ts',
};

describe('discoverWrapperCallCandidates', () => {
  it('finds direct and aliased literal calls and carries the wrapper and alias evidence', async () => {
    const reader = readerFor();

    const result = await discoverWrapperCallCandidates({
      knownIds: new Set(['src/telemetry.ts:2']),
      reader,
      repository,
      wrappers: [wrapper],
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.candidates.map(({ id }) => id)).toEqual([
      'src/acp-runtime.ts:1',
      'src/acp-runtime.ts:2',
      'src/slack.ts:1',
      'src/telemetry.ts:3',
    ]);
    expect(result.candidates[3]).toMatchObject({
      evidence: [
        { line: 3, path: 'src/telemetry.ts' },
        wrapper.evidence[0],
        { excerpt: '  event: emit,', line: 5, path: 'src/telemetry.ts' },
      ],
      wrapper: { callNames: ['emit', 'event'], name: 'emit' },
    });
    expect(reader.grep.mock.calls.every(([request]) => request.caseSensitive === true)).toBe(true);
    expect(reader.grep.mock.calls[0][0]).toMatchObject({ path: 'src/telemetry.ts' });
  });

  it('skips calls the first pass already found', async () => {
    const result = await discoverWrapperCallCandidates({
      knownIds: new Set(['src/telemetry.ts:3', 'src/acp-runtime.ts:2']),
      reader: readerFor(),
      repository,
      wrappers: [wrapper],
    });

    expect(result.candidates.map(({ id }) => id)).not.toEqual(
      expect.arrayContaining(['src/telemetry.ts:3', 'src/acp-runtime.ts:2'])
    );
  });

  it('searches each wrapper once even when several sinks named it', async () => {
    const reader = readerFor();

    await discoverWrapperCallCandidates({
      knownIds: new Set(),
      reader,
      repository,
      wrappers: [wrapper, { ...wrapper, evidence: [{ ...wrapper.evidence[0], line: 9 }] }],
    });

    expect(reader.grep).toHaveBeenCalledTimes(2);
  });

  it('caps the number of wrappers searched and reports the rest', async () => {
    const reader = readerFor({
      grep: jest.fn(async () => ({ items: [], status: 'complete' as const })),
    });
    const wrappers = Array.from({ length: MAX_LOGGING_WRAPPERS + 2 }, (_, index) => ({
      ...wrapper,
      name: `report${String(index).padStart(2, '0')}`,
    }));

    const result = await discoverWrapperCallCandidates({
      knownIds: new Set(),
      reader,
      repository,
      wrappers,
    });

    expect(result.skippedWrappers).toBe(2);
    expect(reader.grep).toHaveBeenCalledTimes(MAX_LOGGING_WRAPPERS * 2);
  });

  it('caps the number of call sites and reports the rest', async () => {
    const hits = Array.from({ length: MAX_WRAPPER_CALL_CANDIDATES + 3 }, (_, index) => ({
      line: 1,
      path: `src/caller-${String(index).padStart(4, '0')}.ts`,
      text: 'emit("job.failed")',
    }));
    const reader = readerFor({
      grep: jest.fn(async ({ path }: GrepRequest) => ({
        items: path === undefined ? hits : [],
        status: 'complete' as const,
      })),
      readWindow: jest.fn(async ({ path }) => ({
        status: 'success' as const,
        value: { endLine: 1, lines: ['emit("job.failed")'], path, startLine: 1 },
      })),
    });

    const result = await discoverWrapperCallCandidates({
      knownIds: new Set(),
      reader,
      repository,
      wrappers: [wrapper],
    });

    expect(result.candidates).toHaveLength(MAX_WRAPPER_CALL_CANDIDATES);
    expect(result.skippedCalls).toBe(3);
  });

  it('returns a search failure as a diagnostic', async () => {
    const reader = readerFor({
      grep: jest.fn(async () => ({
        error: { code: 'grep_failed', message: 'sandbox down', retryable: true },
        status: 'failure' as const,
      })),
    });

    const result = await discoverWrapperCallCandidates({
      knownIds: new Set(),
      reader,
      repository,
      wrappers: [wrapper],
    });

    expect(result.diagnostics.map(({ kind }) => kind)).toEqual(['grep', 'grep']);
  });

  it('does nothing without wrappers', async () => {
    const reader = readerFor();

    const result = await discoverWrapperCallCandidates({
      knownIds: new Set(),
      reader,
      repository,
      wrappers: [],
    });

    expect(result).toEqual({
      candidates: [],
      diagnostics: [],
      skippedCalls: 0,
      skippedWrappers: 0,
    });
    expect(reader.grep).not.toHaveBeenCalled();
  });
});
