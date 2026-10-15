/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';

import {
  containsLoggingCall,
  declaredWrapperName,
  enclosingDeclarationIndex,
  hasDynamicMessage,
  isSourceCodeMessage,
  levelForMessage,
  loggingWrapperFor,
  wrapperAliasesOn,
  wrapperAliasPattern,
  wrapperCallPattern,
} from './logging_wrappers';

/** Returns whether a Git-compatible ERE matches one source line. */
const ereMatches = (pattern: string, source: string): boolean =>
  spawnSync('grep', ['-E', pattern], { encoding: 'utf8', input: source }).status === 0;

describe('hasDynamicMessage', () => {
  it.each([
    ['logger.emit({ body: name, attributes });'],
    ['console.error(message)'],
    ['logger.emit({\n  body: name,'],
    ['log.Printf(format, args...)'],
  ])('treats %j as a possible wrapper sink', (source) => {
    expect(hasDynamicMessage(source, 0)).toBe(true);
  });

  it.each([
    ['logger.info("started")'],
    ['logger.emit({ body: "job.failed" })'],
    ['logging.info(f"user {name}")'],
    ['logger.warn(String.format("slow %d", ms))'],
    ['logger.error(\n  "payment failed"'],
    ['customSink(message)'],
  ])('treats %j as a literal or unknown message', (source) => {
    expect(hasDynamicMessage(source, 0)).toBe(false);
  });
});

describe('declaredWrapperName', () => {
  it.each([
    [
      'const emit = (name: string, details: Record<string, string> = {}) =>',
      '  logger.emit({ body: name, attributes: { ...common } });',
      'emit',
    ],
    ['const say = msg => {', '  console.log(msg);', 'say'],
    ['    def log(self, message):', '        logger.info(message)', 'log'],
    ['  private void warnUser(String text) {', '    log.warn(text);', 'warnUser'],
    ['func report(msg string) {', '\tlog.Printf(msg)', 'report'],
  ])('names %s as the wrapper of %s', (declarationLine, sink, name) => {
    expect(declaredWrapperName({ declarationLine, matchedLineIndex: 0, sourceWindow: sink })).toBe(
      name
    );
  });

  it.each([
    ['const terminate = () =>', '  logger.emit({ body: event.type, attributes });'],
    ['const emit = (name: string) =>', '  logger.emit({ body: "fixed", attributes: name });'],
    ['const emit = (type: string) =>', '  logger.emit({ body: event.type });'],
    ['function handle(request) {', '  console.error(error);'],
  ])('names no wrapper for %s with %s', (declarationLine, sink) => {
    expect(
      declaredWrapperName({ declarationLine, matchedLineIndex: 0, sourceWindow: sink })
    ).toBeUndefined();
  });
});

describe('containsLoggingCall', () => {
  it('recognizes source code returned in place of a message', () => {
    expect(containsLoggingCall('logger.emit({ body: name, context: ctx, attributes: {')).toBe(true);
    expect(containsLoggingCall('console.error(`failed`)')).toBe(true);
    expect(containsLoggingCall('Telemetry SDK span failed; agent work continues.')).toBe(false);
  });
});

describe('isSourceCodeMessage', () => {
  it.each([
    ['logger.emit({ body: name });', '  logger.emit({ body: name });'],
    ['name', '  logger.emit({ body: name });'],
    ['event.type', '  logger.emit({ body: event.type, attributes });'],
    ['event?.type', '  logger.emit({ body: event?.type });'],
  ])('treats %s as code', (message, excerpt) => {
    expect(isSourceCodeMessage(message, excerpt)).toBe(true);
  });

  it.each([
    ['pi.error', 'emit("pi.error", { "stop.reason": "error" });'],
    ['started', "logger.info('started');"],
    ['acp.retry.', 'telemetry?.event(`acp.retry.${recovery.phase}`, {});'],
    ['Telemetry SDK span failed', 'console.warn("Telemetry SDK span failed", error);'],
  ])('treats %s as a message', (message, excerpt) => {
    expect(isSourceCodeMessage(message, excerpt)).toBe(false);
  });
});

describe('enclosingDeclarationIndex', () => {
  it('finds a variable-assigned closure above nested calls and object literals', () => {
    const lines = [
      'const emit = (name: string, details: Record<string, string> = {}) =>',
      '  safe(() => {',
      '    const common = {',
      '      ...attrs(),',
      '    };',
      '    const ctx = trace.setSpan(context.active(), span);',
      '    logger.emit({ body: name, context: ctx });',
    ];

    expect(enclosingDeclarationIndex(lines, 6)).toBe(0);
  });

  it.each([
    ['def log_failure(message):'],
    ['func logf(format string, args ...any) {'],
    ['func (s *Server) logf(format string, args ...any) {'],
    ['function report(message) {'],
    ['  private report(message: string): void {'],
    ['  public void report(String message) {'],
    ['fun report(message: String) {'],
  ])('recognises the declaration %s', (line) => {
    expect(enclosingDeclarationIndex([line, '  sink(message)'], 1)).toBe(0);
  });

  it.each([
    ['if (failed) {'],
    ['} catch (error) {'],
    ['safe(() => {'],
    ['const ctx = trace.setSpan('],
  ])('does not treat %s as a declaration', (line) => {
    expect(enclosingDeclarationIndex([line, 'sink(message)'], 1)).toBeUndefined();
  });
});

describe('loggingWrapperFor', () => {
  const sink = { excerpt: 'logger.emit({ body: name });', line: 15, path: 'src/telemetry.ts' };
  const declaration = {
    excerpt: 'const emit = (name: string) =>',
    line: 1,
    path: 'src/telemetry.ts',
  };

  it('accepts a name declared in the code the classifier saw, as a bare-only common name', () => {
    expect(
      loggingWrapperFor({
        evidence: [sink, declaration],
        name: 'emit',
        sourceWindow: sink.excerpt,
      })
    ).toEqual({
      evidence: [sink, declaration],
      forms: { bare: true, member: false },
      name: 'emit',
      path: 'src/telemetry.ts',
    });
  });

  it('allows member calls for a free function with a distinctive name', () => {
    expect(
      loggingWrapperFor({
        evidence: [
          { ...sink, excerpt: 'function reportFailure(message) {\n  console.error(message)' },
        ],
        name: 'reportFailure',
        sourceWindow: 'function reportFailure(message) {\n  console.error(message)',
      })?.forms
    ).toEqual({ bare: true, member: true });
  });

  it('searches a method only through a receiver', () => {
    expect(
      loggingWrapperFor({
        evidence: [{ ...sink, excerpt: '  def report(self, message):\n    logger.error(message)' }],
        name: 'report',
        sourceWindow: '  def report(self, message):\n    logger.error(message)',
      })?.forms
    ).toEqual({ bare: false, member: true });
  });

  it.each([
    ['a name the source does not declare', 'publishEvent'],
    ['a name that is only called', 'logger'],
    ['a name that is not an identifier', 'emit|.*'],
    ['an over-long name', 'a'.repeat(129)],
  ])('rejects %s', (_label, name) => {
    expect(
      loggingWrapperFor({ evidence: [sink, declaration], name, sourceWindow: sink.excerpt })
    ).toBeUndefined();
  });

  it('rejects a declaration that only appears in another file', () => {
    expect(
      loggingWrapperFor({
        evidence: [sink, { ...declaration, path: 'src/other.ts' }],
        name: 'emit',
        sourceWindow: sink.excerpt,
      })
    ).toBeUndefined();
  });
});

describe('wrapperCallPattern', () => {
  const pattern = wrapperCallPattern({ bareNames: ['emit'], memberNames: ['event'] }) ?? '';

  it.each([
    ['emit("slack.turn.failed", {});'],
    ["  emit('pi.error')"],
    ['telemetry?.event(`acp.retry.${recovery.phase}`, {})'],
    ['turn.event("acp.retry.failed")'],
  ])('matches the literal call %s', (source) => {
    expect(ereMatches(pattern, source)).toBe(true);
  });

  it.each([['emitter.emit("close")'], ['emit(name, details)'], ['reemit("x")'], ['event("x")']])(
    'does not match %s',
    (source) => {
      expect(ereMatches(pattern, source)).toBe(false);
    }
  );

  it('contains no control characters, which source readers reject', () => {
    expect(`${pattern}${wrapperAliasPattern('emit')}`).not.toMatch(/[\u0000-\u001f\u007f]/);
  });

  it('returns nothing when a wrapper has no call form', () => {
    expect(wrapperCallPattern({ bareNames: [], memberNames: [] })).toBeUndefined();
  });
});

describe('wrapper aliases', () => {
  it('finds a property that is assigned the wrapper', () => {
    const line = '    event: emit,';

    expect(ereMatches(wrapperAliasPattern('emit'), line)).toBe(true);
    expect(wrapperAliasesOn(line, 'emit')).toEqual(['event']);
  });

  it('ignores a property whose value only starts with the wrapper name', () => {
    expect(wrapperAliasesOn('  event: emitter,', 'emit')).toEqual([]);
  });
});

describe('levelForMessage', () => {
  it.each([
    ['slack.turn.failed', 'error'],
    ['pi.error', 'error'],
    ['turnFailed', 'error'],
    ['acp.retry.${recovery.phase}', 'warn'],
    ['permission.denied', 'warn'],
    ['slack.message.received', 'info'],
    ['errorless', 'info'],
  ])('maps %s to %s', (message, level) => {
    expect(levelForMessage(message)).toBe(level);
  });
});
