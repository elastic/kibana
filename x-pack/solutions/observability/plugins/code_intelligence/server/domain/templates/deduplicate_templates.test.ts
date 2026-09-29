/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderQueryTemplate } from '../models/query_codec';
import { deduplicateTemplates } from './deduplicate_templates';
import { normalizeTemplateQuery, semanticDigest, templateIdentity } from './template_identity';

/** Supplies one generated template with controllable evidence and severity for identity tests. */
const template = ({
  evidence,
  logLevel,
  severityScore,
}: {
  readonly evidence: readonly {
    readonly excerpt: string;
    readonly line: number;
    readonly path: string;
  }[];
  readonly logLevel?: string;
  readonly severityScore?: number;
}) => ({
  description: 'Finds one log message.',
  evidence,
  extractorVersion: 'phase-3',
  id: 'ignored-by-deduplication',
  ...(logLevel === undefined ? {} : { logLevel }),
  parameters: {
    source: {
      description: 'Log source.',
      example: 'logs-app-*',
      kind: 'source' as const,
      name: 'source',
    },
  },
  query: 'FROM [[source]]\n| WHERE message IS NOT NULL',
  repository: 'elastic/example',
  revision: 'a'.repeat(40),
  severityScore,
  signalType: 'log' as const,
  title: 'Log message',
});

describe('template identity and deduplication', () => {
  it('normalizes formatting without changing quoted literal contents', () => {
    expect(normalizeTemplateQuery(' FROM  [[source]]  | WHERE note == "two  spaces" ')).toBe(
      'FROM [[source]] | WHERE note == "two  spaces"'
    );
  });

  it('preserves line-comment newlines while normalizing CRLF and surrounding formatting', () => {
    /** The terminating newline makes the LIMIT command executable rather than part of the comment. */
    const executableLimit = 'FROM x // note\n| LIMIT 1';
    /** The same apparent command text remains fully commented without a newline. */
    const commentedLimit = 'FROM x // note | LIMIT 1';
    /** CRLF source formatting has the same semantic line-comment boundary as LF. */
    const crlfLimit = ' FROM x  // note\r\n | LIMIT 1 ';
    /** Holds immutable fields that isolate query normalization in identity comparisons. */
    const identityScope = {
      extractorVersion: 'phase-3',
      repository: 'elastic/example',
      revision: 'a'.repeat(40),
      signalType: 'log' as const,
    };

    expect(normalizeTemplateQuery(executableLimit)).toBe(executableLimit);
    expect(normalizeTemplateQuery(crlfLimit)).toBe(executableLimit);
    expect(templateIdentity({ ...identityScope, query: executableLimit })).toBe(
      templateIdentity({ ...identityScope, query: crlfLimit })
    );
    expect(templateIdentity({ ...identityScope, query: executableLimit })).not.toBe(
      templateIdentity({ ...identityScope, query: commentedLimit })
    );
  });

  it('preserves triple-quoted literal whitespace while normalizing surrounding formatting', () => {
    /** Queries differ only inside their triple-quoted literal values. */
    const oneSpace = ' FROM [[source]]\n| WHERE note == """a " two spaces""" ';
    /** The second literal has an additional meaningful whitespace character. */
    const twoSpaces = 'FROM [[source]] | WHERE note == """a " two  spaces"""';
    /** The immutable scope makes the identity assertion independent of template fixtures. */
    const identityScope = {
      extractorVersion: 'phase-3',
      repository: 'elastic/example',
      revision: 'a'.repeat(40),
      signalType: 'log' as const,
    };

    expect(normalizeTemplateQuery(oneSpace)).toBe(
      'FROM [[source]] | WHERE note == """a " two spaces"""'
    );
    expect(normalizeTemplateQuery(twoSpaces)).toBe(twoSpaces);
    expect(templateIdentity({ ...identityScope, query: oneSpace })).not.toBe(
      templateIdentity({ ...identityScope, query: twoSpaces })
    );
  });

  it('hashes unpaired UTF-16 surrogates injectively without changing normal Unicode hashes', () => {
    /** Distinct source literals carry different unpaired high-surrogate UTF-16 code units. */
    const firstUnpairedSurrogate: string = 'span-\uD800';
    /** The second source literal must never collapse into the first replacement-character digest. */
    const secondUnpairedSurrogate: string = 'span-\uD801';
    /** Valid Unicode remains encoded with standard UTF-8 bytes. */
    const normalUnicode: string = 'café 😀';

    expect(semanticDigest('abc')).toBe('ba7816bf8f01cfea');
    expect(semanticDigest(firstUnpairedSurrogate)).toBe('10a64823b8bd7448');
    expect(semanticDigest(firstUnpairedSurrogate)).not.toBe(
      semanticDigest(secondUnpairedSurrogate)
    );
    expect(semanticDigest(normalUnicode)).toBe('043764df773ac7ce');
  });

  it('uses repository, immutable revision, signal type, normalized query, and extractor version', () => {
    /** Provides the common immutable identity scope. */
    const input = {
      extractorVersion: 'phase-3',
      query: 'FROM [[source]] | WHERE message IS NOT NULL',
      repository: 'elastic/example',
      revision: 'a'.repeat(40),
      signalType: 'log' as const,
    };
    expect(templateIdentity(input)).toBe(
      templateIdentity({ ...input, query: ' FROM [[source]]\n| WHERE message IS NOT NULL ' })
    );
    expect(templateIdentity(input)).toBe(
      '241670a06792e991b18848ec3bc37a531493375e242293271285a0de59355864'
    );
    expect(templateIdentity(input)).not.toBe(
      templateIdentity({ ...input, extractorVersion: 'phase-4' })
    );
    expect(templateIdentity(input)).not.toBe(
      templateIdentity({ ...input, revision: 'b'.repeat(40) })
    );
  });

  it('merges same-query evidence by path and line and keeps the highest severity', () => {
    /** Combines duplicate query templates emitted by 2 source locations. */
    const merged = deduplicateTemplates([
      template({ evidence: [{ excerpt: 'old', line: 9, path: 'src/a.ts' }], severityScore: 30 }),
      template({
        evidence: [
          { excerpt: 'replacement', line: 9, path: 'src/a.ts' },
          { excerpt: 'other', line: 2, path: 'src/b.ts' },
        ],
        severityScore: 80,
      }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].severityScore).toBe(80);
    expect(merged[0].evidence).toEqual([
      { excerpt: 'replacement', line: 9, path: 'src/a.ts' },
      { excerpt: 'other', line: 2, path: 'src/b.ts' },
    ]);
    expect(renderQueryTemplate(merged[0]).query).toBe(
      'FROM logs-app-*\n| WHERE message IS NOT NULL'
    );
  });

  it('takes the log level from the unique highest-severity occurrence regardless of input order', () => {
    /** An info-level and error-level site generate the same query with distinct classification severity. */
    const info = template({
      evidence: [{ excerpt: 'info', line: 1, path: 'src/info.ts' }],
      logLevel: 'info',
      severityScore: 30,
    });
    /** The error site must supply both merged severity and matching log-level metadata. */
    const error = template({
      evidence: [{ excerpt: 'error', line: 2, path: 'src/error.ts' }],
      logLevel: 'error',
      severityScore: 70,
    });

    for (const occurrences of [
      [info, error],
      [error, info],
    ]) {
      /** Merges the same occurrences in both orders to prove severity metadata is deterministic. */
      const merged = deduplicateTemplates(occurrences);
      expect(merged).toHaveLength(1);
      expect(merged[0]).toMatchObject({ logLevel: 'error', severityScore: 70 });
    }
  });

  it('omits log level when equally severe occurrences disagree', () => {
    /** Equally severe but distinct normalized levels have no unambiguous metadata winner. */
    const merged = deduplicateTemplates([
      template({
        evidence: [{ excerpt: 'warning', line: 1, path: 'src/warn.ts' }],
        logLevel: 'warn',
        severityScore: 50,
      }),
      template({
        evidence: [{ excerpt: 'notice', line: 2, path: 'src/notice.ts' }],
        logLevel: 'info',
        severityScore: 50,
      }),
    ]);

    expect(merged[0]?.logLevel).toBeUndefined();
    expect(merged[0]?.severityScore).toBe(50);
  });
});
