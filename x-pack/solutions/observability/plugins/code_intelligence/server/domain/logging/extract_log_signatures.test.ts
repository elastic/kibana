/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateLogTemplates } from './generate_log_templates';
import {
  decodeSourceLiteral,
  extractLogSignatures,
  staticPrefixOf,
  staticSegmentsOf,
} from './extract_log_signatures';

/** Supplies immutable scope metadata for rendered source-literal regression templates. */
const templateContext = {
  extractorVersion: 'phase-3',
  repository: 'elastic/example',
  revision: 'a'.repeat(40),
};

describe('log signatures', () => {
  it('extracts method calls and normalizes warning severity', () => {
    /** A Python method form exercises level alias normalization. */
    const signatures = extractLogSignatures({ content: 'logging.warning("disk space low")' });

    expect(signatures).toEqual([
      expect.objectContaining({ level: 'warn', message: 'disk space low', severity: 50 }),
    ]);
  });

  it.each([
    'logger.exception("payment failed")',
    'logging.exception("payment failed")',
    'logging.getLogger(__name__).exception("payment failed")',
  ])('normalizes Python exception calls to error severity: %s', (content) => {
    expect(extractLogSignatures({ content })).toEqual([
      expect.objectContaining({ level: 'error', message: 'payment failed', severity: 70 }),
    ]);
  });

  it('extracts multi-line method calls', () => {
    /** The first literal can be on a later source line within the bounded window. */
    const signatures = extractLogSignatures({
      content: 'logger.error(\n  "payment authorization failed"\n);',
    });

    expect(signatures).toEqual([
      expect.objectContaining({ level: 'error', message: 'payment authorization failed' }),
    ]);
  });

  it('decodes TypeScript source escapes before slicing static segments without decoding classifier messages', () => {
    /** Identifies TypeScript as the source grammar for the raw logging literal. */
    const evidence = [{ excerpt: 'logger.error(...)', line: 7, path: 'src/logger.ts' }];
    /** Keeps lexical escape spelling intact in the source excerpt supplied to the extractor. */
    const source = String.raw`logger.error("say \"hi\"\\ path\nnext\u{1f600}")`;
    /** Extracts the cooked runtime message that the logger receives. */
    const sourceSignature = extractLogSignatures({ content: source, evidence })[0];
    /** Renders the cooked static segment through the ES|QL string-literal escaper. */
    const sourceQuery = generateLogTemplates({
      context: templateContext,
      signatures: [sourceSignature],
    })[0].query;
    /** Exercises a classifier value with the same lexical characters, which is already a semantic value. */
    const classifiedSignature = extractLogSignatures({
      classified: { level: 'error', staticMessage: String.raw`say \"hi\"\\ path\nnext` },
      content: '',
      evidence,
    })[0];

    expect(sourceSignature.staticSegments).toEqual(['say "hi"\\ path\nnext😀']);
    expect(sourceQuery).toContain('"say \\"hi\\"\\\\ path\nnext😀"');
    expect(classifiedSignature.staticSegments).toEqual([String.raw`say \"hi\"\\ path\nnext`]);
  });

  it('decodes C# slash-x escapes through their greedy four-digit boundary', () => {
    /** Identifies C# grammar for source escapes that differ from two-digit slash-x languages. */
    const evidence = [{ excerpt: 'logger.LogError(...)', line: 9, path: 'src/logger.cs' }];
    /** C# consumes all four hexadecimal digits as one UTF-16 code unit. */
    const fourDigitSignature = extractLogSignatures({
      content: String.raw`logger.LogError("code \x1234")`,
      evidence,
    })[0];
    /** The fifth hexadecimal character remains ordinary literal text after C# reaches its four-digit maximum. */
    const fiveDigitSignature = extractLogSignatures({
      content: String.raw`logger.LogError("code \x12345")`,
      evidence,
    })[0];
    /** An empty slash-x escape has no runtime value and must not become a query anchor. */
    const malformed = extractLogSignatures({
      content: 'logger.LogError("code ' + '\\x' + '")',
      evidence,
    });
    /** Renders the positive case so the query literal proves the cooked C# value. */
    const fourDigitQuery = generateLogTemplates({
      context: templateContext,
      signatures: [fourDigitSignature],
    })[0].query;

    expect(fourDigitSignature.staticSegments).toEqual(['code ሴ']);
    expect(fourDigitQuery).toContain('"code ሴ"');
    expect(fiveDigitSignature.staticSegments).toEqual(['code ሴ5']);
    expect(malformed).toEqual([]);
  });

  it('skips escaped source literals when evidence cannot establish a supported language', () => {
    /** Unknown extensions cannot prove the meaning of source escape sequences. */
    const evidence = [{ excerpt: 'logger.error(...)', line: 7, path: 'src/logger.unknown' }];
    /** The candidate remains available upstream through its original evidence but yields no false literal query. */
    const signatures = extractLogSignatures({
      content: String.raw`logger.error("say \"hi\"")`,
      evidence,
    });

    expect(signatures).toEqual([]);
  });

  it('deduplicates cooked Go messages while retaining raw and escaped messages with distinct runtime values', () => {
    /** Go establishes the distinct cooked semantics of raw and double-quoted string literals. */
    const evidence = [{ excerpt: 'logger.Error(...)', line: 7, path: 'src/logger.go' }];
    /** The raw literal retains slash-n while the double-quoted literal emits a physical newline. */
    const distinctMessages = extractLogSignatures({
      content: 'logger.Error("line\\n"); logger.Error(`line\\n`)',
      evidence,
    });
    /** Different lexical spellings with the same cooked value must create only one query anchor. */
    const duplicateMessages = extractLogSignatures({
      content: 'logger.Error("same"); logger.Error(`same`)',
      evidence,
    });

    expect(distinctMessages.map(({ message }) => message)).toEqual(['line\n', String.raw`line\n`]);
    expect(duplicateMessages).toHaveLength(1);
    expect(duplicateMessages[0]).toMatchObject({ message: 'same' });
  });

  it('rejects non-ASCII Go byte escapes while decoding ASCII byte escapes', () => {
    /** Go byte escapes cannot safely produce a Unicode query literal above ASCII. */
    const evidence = [{ excerpt: 'logger.Error(...)', line: 7, path: 'src/logger.go' }];
    /** ASCII bytes preserve their matching Unicode runtime character. */
    const ascii = extractLogSignatures({
      content: String.raw`logger.Error("code \x41")`,
      evidence,
    });
    /** A non-ASCII Go byte remains discovered upstream but produces no false literal signature. */
    const nonAscii = extractLogSignatures({
      content: String.raw`logger.Error("code \xFF")`,
      evidence,
    });

    expect(ascii).toEqual([expect.objectContaining({ message: 'code A' })]);
    expect(nonAscii).toEqual([]);
  });

  it('preserves Go raw-string backslashes and rejects unsupported backtick grammars', () => {
    /** Go backticks preserve each source backslash as part of the runtime message. */
    const goEvidence = [{ excerpt: 'logger.error(...)', line: 7, path: 'src/logger.go' }];
    /** Other languages cannot establish the semantics of a backtick-delimited logging literal. */
    const unsupportedEvidence = [{ excerpt: 'logger.error(...)', line: 8, path: 'src/logger.py' }];
    /** A raw Go literal must retain its path separator instead of decoding or dropping it. */
    const goSignatures = extractLogSignatures({
      content: 'logger.error(`path C:\\temp failed`)',
      evidence: goEvidence,
    });
    /** Python backticks are not supported string literals for this heuristic extractor. */
    const unsupportedSignatures = extractLogSignatures({
      content: 'logger.error(`path C:\\temp failed`)',
      evidence: unsupportedEvidence,
    });

    expect(goSignatures[0]).toMatchObject({ message: String.raw`path C:\temp failed` });
    expect(unsupportedSignatures).toEqual([]);
  });

  it('ends Go raw strings at the first backtick while retaining JavaScript escaped backticks', () => {
    /** A Go raw backslash directly before its delimiter cannot escape that delimiter. */
    const goEvidence = [{ excerpt: 'logger.error(...)', line: 7, path: 'src/logger.go' }];
    /** TypeScript template strings retain their escaped backtick as a runtime character. */
    const typeScriptEvidence = [{ excerpt: 'logger.error(...)', line: 8, path: 'src/logger.ts' }];
    /** The second Go argument must never become part of the first raw string anchor. */
    const goSignatures = extractLogSignatures({
      content: 'logger.error(`path C:\\`, `metadata`)',
      evidence: goEvidence,
    });
    /** JavaScript-family captures still allow a backslash to protect an embedded template delimiter. */
    const typeScriptSignatures = extractLogSignatures({
      content: 'logger.error(`say \\`hi`)',
      evidence: typeScriptEvidence,
    });

    expect(goSignatures).toEqual([expect.objectContaining({ message: 'path C:\\' })]);
    expect(
      decodeSourceLiteral({
        evidence: typeScriptEvidence,
        message: String.raw`say \`hi`,
        quote: '`',
      })
    ).toBe('say `hi');
    expect(typeScriptSignatures).toEqual([expect.objectContaining({ message: 'say `hi' })]);
  });

  it('extracts Rust macro calls and retains source evidence', () => {
    /** Evidence is carried unchanged into deterministic output. */
    const evidence = [
      { excerpt: 'tracing::error!("connection refused")', line: 42, path: 'src/main.rs' },
    ];

    /** Extracted signature must preserve evidence for later template generation. */
    const signatures = extractLogSignatures({ content: evidence[0].excerpt, evidence });

    expect(signatures).toEqual([
      expect.objectContaining({ evidence, level: 'error', staticPrefix: 'connection refused' }),
    ]);
  });

  it('keeps static segments on both sides of interpolation and format placeholders', () => {
    expect(staticSegmentsOf('Processed order ${orderId} with status %s')).toEqual([
      'Processed order',
      'with status',
    ]);
    expect(staticPrefixOf('Processed order ${orderId} with status')).toBe('Processed order');
  });

  it('removes shared printf placeholders while retaining surrounding static anchors', () => {
    /** Representative C/C++, Python, POSIX, and Go conversions governed by one grammar. */
    const messages = [
      'request %u failed',
      'request %i failed',
      'request %ld failed',
      'request %lld failed',
      'request %zu failed',
      'request %+08.2f failed',
      'request %*.*s failed',
      'request %(name)s failed',
      'request %1$s failed',
      'request %+v failed',
    ];

    for (const message of messages) {
      expect(staticPrefixOf(message)).toBe('request');
      expect(staticSegmentsOf(message)).toEqual(['request', 'failed']);
    }
  });

  it('filters printf conversions using contiguous percent-run parity', () => {
    expect(staticPrefixOf('before %s after')).toBe('before');
    expect(staticSegmentsOf('before %s after')).toEqual(['before', 'after']);
    expect(staticPrefixOf('before %% after')).toBe('before %% after');
    expect(staticSegmentsOf('before %% after')).toEqual(['before %% after']);
    expect(staticPrefixOf('before %%%s after')).toBe('before %%');
    expect(staticSegmentsOf('before %%%s after')).toEqual(['before %%', 'after']);
    expect(staticPrefixOf('before %%%%s after')).toBe('before %%%%s after');
    expect(staticSegmentsOf('before %%%%s after')).toEqual(['before %%%%s after']);
    expect(staticPrefixOf('before %%%%%s after')).toBe('before %%%%');
    expect(staticSegmentsOf('before %%%%%s after')).toEqual(['before %%%%', 'after']);
  });

  it('supports static-prefix placeholder styles', () => {
    expect(staticPrefixOf('request {{requestId}} failed')).toBe('request');
    expect(staticPrefixOf('request #{requestId} failed')).toBe('request');
    expect(staticPrefixOf('request $requestId failed')).toBe('request');
  });

  it('removes complete double-bracket placeholders from static segments', () => {
    expect(staticSegmentsOf('request {{requestId}} failed')).toEqual(['request', 'failed']);
  });

  it('extracts static segments from Go, Java, and C# logging calls', () => {
    expect(extractLogSignatures({ content: 'log.Error("request %s failed", requestID)' })).toEqual([
      expect.objectContaining({ level: 'error', staticSegments: ['request', 'failed'] }),
    ]);
    expect(
      extractLogSignatures({ content: 'logger.error("request {} failed", requestId)' })
    ).toEqual([expect.objectContaining({ level: 'error', staticSegments: ['request', 'failed'] })]);
    expect(
      extractLogSignatures({ content: 'logger.LogError("request {RequestId} failed", requestId)' })
    ).toEqual([expect.objectContaining({ level: 'error', staticSegments: ['request', 'failed'] })]);
  });

  it('drops short segments and non-logging text', () => {
    expect(staticSegmentsOf('id {} ok')).toEqual([]);
    expect(extractLogSignatures({ content: 'processPayment("payment failed")' })).toEqual([]);
  });

  it('rejects classified short and dynamic-only messages', () => {
    expect(
      extractLogSignatures({ classified: { level: 'info', staticMessage: 'ok' }, content: '' })
    ).toEqual([]);
    expect(
      extractLogSignatures({
        classified: { level: 'info', staticMessage: '${requestId}' },
        content: '',
      })
    ).toEqual([]);
  });

  it('retains a meaningful static segment after a leading dynamic value', () => {
    expect(extractLogSignatures({ content: 'logger.info("{} completed", job)' })).toEqual([
      expect.objectContaining({ staticPrefix: '', staticSegments: ['completed'] }),
    ]);
  });

  it('rejects dynamic-only messages', () => {
    expect(extractLogSignatures({ content: 'logger.info("{}", value)' })).toEqual([]);
  });

  it('uses a classifier-supplied level and static message for unparseable calls', () => {
    /** Panic has no source level method but classification can safely provide one. */
    const signatures = extractLogSignatures({
      classified: { level: 'error', staticMessage: 'failed to charge card' },
      content: 'panic(fmt.Sprintf("failed to charge card: %v", err))',
    });

    expect(signatures).toEqual([
      expect.objectContaining({
        level: 'error',
        message: 'failed to charge card',
        staticSegments: ['failed to charge card'],
      }),
    ]);
  });

  it('preserves source order when a Rust macro precedes a method call', () => {
    expect(
      extractLogSignatures({
        content: 'error!("macro first");\nlogger.info("method second");',
      }).map((signature) => signature.message)
    ).toEqual(['macro first', 'method second']);
  });

  it('deduplicates repeated calls in a source window', () => {
    expect(
      extractLogSignatures({
        content: 'logger.error("payment failed");\nlogger.error("payment failed");',
      })
    ).toHaveLength(1);
  });
});
