/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { candidateIdRt } from '../models/candidate_id_codec';
import type { ResolvedRepository } from '../models/repository_codec';
import type { SourceReader } from '../ports/source_reader';
import { loggingIdiomPatterns } from './idiom_patterns';
import { discoverLoggingCandidates } from './discover_logging_candidates';
import { extractLogSignatures } from './extract_log_signatures';

/** Immutable snapshot supplied to each fake source operation. */
const repository: ResolvedRepository = {
  commitSha: 'a'.repeat(40),
  repository: 'acme/service',
  requestedRevision: 'main',
};

/** Builds a complete bounded source window with content at its requested matched line. */
const windowFor = (
  path: string,
  startLine: number,
  endLine: number,
  matchedLine: number,
  line: string
) => ({
  endLine,
  lines: Array.from({ length: endLine - startLine + 1 }, (_, index) =>
    startLine + index === matchedLine ? line : ''
  ),
  path,
  startLine,
});

/** Creates a reader with complete empty operations that tests can selectively replace. */
const readerWith = (overrides: Partial<SourceReader>): SourceReader => ({
  grep: async () => ({ items: [], status: 'complete' }),
  listSourcePage: async () => ({ items: [], status: 'complete' }),
  readWindow: async ({ endLine, path, startLine }) => ({
    status: 'success',
    value: windowFor(path, startLine, endLine, startLine, 'logger.info("started")'),
  }),
  ...overrides,
});

describe('discoverLoggingCandidates', () => {
  it('consumes more than 500 candidates across every page without sampling', async () => {
    /** All candidates arrive through one paginated standard idiom. */
    const locations = Array.from({ length: 501 }, (_, index) => ({
      line: 1,
      path: `src/file-${String(index).padStart(3, '0')}.ts`,
      text: 'console.info("started")',
    }));
    /** Reader returns 2 pages only for the console idiom. */
    const reader = readerWith({
      grep: async ({ cursor, pattern }) => {
        if (!pattern.includes('console')) return { items: [], status: 'complete' };
        if (cursor === undefined)
          return { items: locations.slice(0, 500), nextCursor: 'page-2', status: 'incomplete' };
        return { items: locations.slice(500), status: 'complete' };
      },
    });

    /** Complete discovery result proves paging did not sample the candidate set. */
    const result = await discoverLoggingCandidates({ reader, repository });

    expect(result.candidates).toHaveLength(501);
    expect(result.candidates[0]?.id).toBe('src/file-000.ts:1');
    expect(candidateIdRt.decode(result.candidates[0]?.id)._tag).toBe('Right');
    expect(result.candidates[500]?.id).toBe('src/file-500.ts:1');
    expect(result.diagnostics).toEqual([]);
  });

  it('serializes pattern scans for source readers with strict scan limits', async () => {
    /** Tracks live grep calls across distinct logging patterns. */
    let activeScans = 0;
    /** Records the greatest observed source-scan concurrency. */
    let maximumActiveScans = 0;
    /** Reader yields once inside each scan so concurrent pattern workers would overlap. */
    const reader = readerWith({
      grep: async () => {
        activeScans += 1;
        maximumActiveScans = Math.max(maximumActiveScans, activeScans);
        await new Promise<void>((resolve) => setImmediate(resolve));
        activeScans -= 1;
        return { items: [], status: 'complete' };
      },
    });

    await discoverLoggingCandidates({ patterns: ['logger', 'console'], reader, repository });

    expect(maximumActiveScans).toBe(1);
  });

  it('deduplicates repeated hits, filters paths, and tests non-emission only on the hit line', async () => {
    /** Standard logger method pattern is supplied with intentionally overlapping hits. */
    const reader = readerWith({
      grep: async ({ pattern }) => {
        if (!pattern.includes('[lL]og')) return { items: [], status: 'complete' };
        return {
          items: [
            { line: 2, path: 'src/app.ts', text: 'logger.info("started")' },
            { line: 2, path: 'src/app.ts', text: 'logger.info("started")' },
            { line: 1, path: 'src/logger.ts', text: 'const logger = getLogger("app")' },
            { line: 1, path: 'test/app.test.ts', text: 'logger.info("test")' },
            { line: 1, path: 'generated/client.ts', text: 'logger.info("generated")' },
            { line: 1, path: 'docs/example.ts', text: 'logger.info("documentation")' },
            { line: 1, path: 'vendor/library.ts', text: 'logger.info("dependency")' },
            { line: 1, path: 'build/task.ts', text: 'logger.info("build")' },
            { line: 1, path: '.github/workflows/check.ts', text: 'logger.info("ci")' },
          ],
          status: 'complete',
        };
      },
      readWindow: async ({ endLine, path, startLine }) => {
        /** A neighbouring setup line must not suppress the actual matched emission. */
        const line =
          path === 'src/logger.ts' ? 'const logger = getLogger("app")' : 'logger.info("started")';
        return {
          status: 'success',
          value: windowFor(path, startLine, endLine, path === 'src/app.ts' ? 2 : 1, line),
        };
      },
    });

    /** Discovery result contains only the deduplicated production emission. */
    const result = await discoverLoggingCandidates({ reader, repository });

    expect(result.candidates.map((candidate) => candidate.id)).toEqual(['src/app.ts:2']);
  });

  it('keeps a real multi-line call with a non-emitting adjacent guard and a complete excerpt', async () => {
    /** Only the logger call line is a grep hit; its immediate guard must remain as context. */
    const reader = readerWith({
      grep: async ({ pattern }) =>
        pattern.includes('[lL]og')
          ? {
              items: [{ line: 2, path: 'src/payment.ts', text: 'logger.error(' }],
              status: 'complete',
            }
          : { items: [], status: 'complete' },
      readWindow: async ({ endLine, path, startLine }) => ({
        status: 'success',
        value: {
          endLine,
          lines: ['if (logger.isErrorEnabled()) {', 'logger.error(', '  "payment failed"'],
          path,
          startLine,
        },
      }),
    });

    /** The matched call survives and carries the full inclusive ±1 source excerpt. */
    const result = await discoverLoggingCandidates({ reader, repository });

    expect(result.candidates).toEqual([
      expect.objectContaining({
        excerpt: 'if (logger.isErrorEnabled()) {\nlogger.error(\n  "payment failed"',
        id: 'src/payment.ts:2',
      }),
    ]);
  });

  it('discovers a chained Python exception emission', async () => {
    /** Reader exposes the hit only when discovery submits the chained-logger exception pattern. */
    const reader = readerWith({
      grep: async ({ pattern }) =>
        pattern.includes('xception') && pattern.includes('[^;]')
          ? {
              items: [
                {
                  line: 1,
                  path: 'src/python_app.py',
                  text: 'logging.getLogger(__name__).exception("payment failed")',
                },
              ],
              status: 'complete',
            }
          : { items: [], status: 'complete' },
      readWindow: async ({ endLine, path, startLine }) => ({
        status: 'success',
        value: windowFor(
          path,
          startLine,
          endLine,
          1,
          'logging.getLogger(__name__).exception("payment failed")'
        ),
      }),
    });

    /** The chained standard idiom reaches classification discovery as a source candidate. */
    const result = await discoverLoggingCandidates({ reader, repository });

    expect(result.candidates.map((candidate) => candidate.id)).toEqual(['src/python_app.py:1']);
  });

  it('retains a first-line hit with its complete requested window', async () => {
    /** Captures the upper bound requested for a first-line candidate. */
    let requestedEndLine: number | undefined;
    /** Reader clamps the seven-line request to both existing source lines. */
    const reader = readerWith({
      grep: async ({ pattern }) =>
        pattern === loggingIdiomPatterns[0]
          ? {
              items: [{ line: 1, path: 'src/first.ts', text: 'logger.info("first")' }],
              status: 'complete',
            }
          : { items: [], status: 'complete' },
      readWindow: async ({ endLine, path, startLine }) => {
        requestedEndLine = endLine;
        return {
          status: 'success',
          value: { endLine: 2, lines: ['logger.info("first")', 'nextLine()'], path, startLine },
        };
      },
    });

    /** Discovery keeps the first source line and both lines of available context. */
    const result = await discoverLoggingCandidates({ reader, repository });

    expect(requestedEndLine).toBe(4);
    expect(result.candidates).toEqual([
      expect.objectContaining({
        excerpt: 'logger.info("first")\nnextLine()',
        id: 'src/first.ts:1',
      }),
    ]);
  });

  it('retains a last-line hit when EOF clamps the requested upper bound', async () => {
    /** Captures the request that extends three lines beyond the end of the file. */
    let requestedEndLine: number | undefined;
    /** Reader clamps the requested end line to the final existing source line. */
    const reader = readerWith({
      grep: async ({ pattern }) =>
        pattern === loggingIdiomPatterns[0]
          ? {
              items: [{ line: 3, path: 'src/last.ts', text: 'logger.info("last")' }],
              status: 'complete',
            }
          : { items: [], status: 'complete' },
      readWindow: async ({ endLine, path, startLine }) => {
        requestedEndLine = endLine;
        return {
          status: 'success',
          value: { endLine: 3, lines: ['previousLine()', 'logger.info("last")'], path, startLine },
        };
      },
    });

    /** EOF clamping retains every existing requested line and the matched last line. */
    const result = await discoverLoggingCandidates({ reader, repository });

    expect(requestedEndLine).toBe(6);
    expect(result.candidates).toEqual([
      expect.objectContaining({
        excerpt: 'previousLine()\nlogger.info("last")',
        id: 'src/last.ts:3',
      }),
    ]);
  });

  it('retains a single-line hit when EOF clamps the requested upper bound', async () => {
    /** Reader returns the only existing line after clamping the request from lines 1-4 to line 1. */
    const reader = readerWith({
      grep: async ({ pattern }) =>
        pattern === loggingIdiomPatterns[0]
          ? {
              items: [{ line: 1, path: 'src/only.ts', text: 'logger.info("only")' }],
              status: 'complete',
            }
          : { items: [], status: 'complete' },
      readWindow: async ({ path, startLine }) => ({
        status: 'success',
        value: { endLine: 1, lines: ['logger.info("only")'], path, startLine },
      }),
    });

    /** The candidate survives when the clamped single-line response includes its hit. */
    const result = await discoverLoggingCandidates({ reader, repository });

    expect(result.candidates).toEqual([
      expect.objectContaining({ excerpt: 'logger.info("only")', id: 'src/only.ts:1' }),
    ]);
  });

  it('keeps the untrimmed source window and the hit line within it', async () => {
    /** The window starts 3 lines above the hit, and its first 2 lines are blank. */
    const reader = readerWith({
      grep: async ({ pattern }) =>
        pattern === loggingIdiomPatterns[0]
          ? {
              items: [{ line: 4, path: 'src/blank.go', text: '\tlog.Println("stopping")' }],
              status: 'complete',
            }
          : { items: [], status: 'complete' },
      readWindow: async ({ endLine, path, startLine }) => ({
        status: 'success',
        value: {
          endLine,
          lines: ['', '  ', 'if err != nil {', '\tlog.Println("stopping")', '\tos.Exit(1)', '}'],
          path,
          startLine,
        },
      }),
    });

    const result = await discoverLoggingCandidates({ reader, repository });

    expect(result.candidates).toEqual([
      expect.objectContaining({
        excerpt: 'if err != nil {\n\tlog.Println("stopping")\n\tos.Exit(1)\n}',
        matchedLineIndex: 3,
        sourceWindow: '\n  \nif err != nil {\n\tlog.Println("stopping")\n\tos.Exit(1)\n}',
      }),
    ]);
  });

  it.each([
    ['    sys.exit(1)', 'fatal'],
    ['sys.exit(1)', 'warn'],
  ])(
    'keeps the indentation of a hit after blank lines so exit analysis sees the real block: %s',
    async (exitLine, level) => {
      /** Blank lines above the hit make trimming remove the hit line's own indentation. */
      const reader = readerWith({
        grep: async ({ pattern }) =>
          pattern === loggingIdiomPatterns[0]
            ? {
                items: [
                  { line: 4, path: 'tools/migrate.py', text: '    logging.warning("aborted")' },
                ],
                status: 'complete',
              }
            : { items: [], status: 'complete' },
        readWindow: async ({ path, startLine }) => ({
          status: 'success',
          value: {
            endLine: 5,
            lines: ['', '', '', '    logging.warning("aborted")', exitLine],
            path,
            startLine,
          },
        }),
      });

      const [candidate] = (await discoverLoggingCandidates({ reader, repository })).candidates;
      const signatures = extractLogSignatures({
        classified: { level: 'warn', staticMessage: 'aborted' },
        content: candidate.sourceWindow,
        evidence: candidate.evidence,
        matchedLineIndex: candidate.matchedLineIndex,
      });

      expect(signatures).toEqual([expect.objectContaining({ level })]);
    }
  );

  it('diagnoses a successful source window that omits its matched line', async () => {
    /** Reader returns a valid source window whose bounds do not contain the grep hit. */
    const reader = readerWith({
      grep: async ({ pattern }) =>
        pattern === loggingIdiomPatterns[0]
          ? {
              items: [{ line: 3, path: 'src/omitted.ts', text: 'logger.info("actual")' }],
              status: 'complete',
            }
          : { items: [], status: 'complete' },
      readWindow: async ({ path }) => ({
        status: 'success',
        value: { endLine: 2, lines: ['setup()', 'logger.info("adjacent")'], path, startLine: 1 },
      }),
    });

    /** Discovery must not classify adjacent text as the omitted source line. */
    const result = await discoverLoggingCandidates({ reader, repository });

    expect(result.candidates).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'matched_line_outside_window', retryable: false }),
        kind: 'window',
        line: 3,
        path: 'src/omitted.ts',
      })
    );
  });

  it('keeps successful patterns when another pattern or source window fails', async () => {
    /** Console pattern succeeds while the first pattern reports a typed failure. */
    const reader = readerWith({
      grep: async ({ pattern }) => {
        if (pattern === loggingIdiomPatterns[0]) {
          return {
            error: { code: 'grep_failed', message: 'bad regex', retryable: false },
            status: 'failure',
          };
        }
        if (pattern.includes('console')) {
          return {
            items: [{ line: 1, path: 'src/app.ts', text: 'console.error("boom")' }],
            status: 'complete',
          };
        }
        return { items: [], status: 'complete' };
      },
      readWindow: async ({ endLine, path, startLine }) => {
        if (path === 'src/app.ts')
          return {
            error: { code: 'show_failed', message: 'gone', retryable: true },
            status: 'failure',
          };
        return {
          status: 'success',
          value: windowFor(path, startLine, endLine, startLine, ''),
        };
      },
    });

    /** Partial discovery result retains both independent operation failures. */
    const result = await discoverLoggingCandidates({ reader, repository });

    expect(result.candidates).toEqual([]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.kind)).toEqual(['grep', 'window']);
    expect(result.diagnostics[1]).toMatchObject({ line: 1, path: 'src/app.ts' });
  });

  it('reports a repeated cursor instead of looping forever', async () => {
    /** Every page repeats the same cursor, violating the paging contract. */
    const reader = readerWith({
      grep: async ({ pattern }) =>
        pattern === loggingIdiomPatterns[0]
          ? { items: [], nextCursor: 'again', status: 'incomplete' }
          : { items: [], status: 'complete' },
    });

    /** Invalid pagination is returned as an explicit diagnostic. */
    const result = await discoverLoggingCandidates({ reader, repository });

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        kind: 'pagination',
        error: expect.objectContaining({ code: 'invalid_grep_cursor' }),
      })
    );
  });
});
