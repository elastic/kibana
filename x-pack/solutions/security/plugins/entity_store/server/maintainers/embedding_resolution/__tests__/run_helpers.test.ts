/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkItemIsOk, formatError, type BulkResponseRow } from '../run_helpers';

describe('formatError', () => {
  // Locks in the `(err as Error)?.message ?? err` semantics that used to be
  // inlined at every catch site. Anything that changes the resulting log
  // string is a behavior change.
  it('returns the message of an Error instance', () => {
    expect(formatError(new Error('boom'))).toBe('boom');
  });

  it('returns a string error verbatim', () => {
    expect(formatError('boom')).toBe('boom');
  });

  it('coerces undefined to the literal string "undefined"', () => {
    expect(formatError(undefined)).toBe('undefined');
  });

  it('coerces null to the literal string "null"', () => {
    expect(formatError(null)).toBe('null');
  });

  it("uses an object's `.message` property when present", () => {
    expect(formatError({ message: 'custom' })).toBe('custom');
  });

  it('falls back to default coercion when the object has no `.message`', () => {
    // `${obj}` gives `[object Object]` — matches the original inline coercion
    // because `{}.message ?? obj` yields the object, then template-strings it.
    expect(formatError({})).toBe('[object Object]');
  });

  it('coerces numeric `.message` values via String()', () => {
    expect(formatError({ message: 42 })).toBe('42');
  });
});

describe('bulkItemIsOk', () => {
  // The pre-refactor inline `isOk` closure and the inline op-lookup in
  // `countBulkResults` both reduced to "look at update/index/create[/delete]
  // and return true iff no `.error`". These tests pin that contract.
  it('returns true for a successful update op', () => {
    const item = {
      update: {
        _index: 'entities-latest-default',
        _id: 'doc-1',
        status: 200,
        result: 'updated',
      },
    } as unknown as BulkResponseRow;
    expect(bulkItemIsOk(item)).toBe(true);
  });

  it('returns false for an errored update op', () => {
    const item = {
      update: {
        _index: 'entities-latest-default',
        _id: 'doc-1',
        status: 400,
        error: { type: 'mapper_parsing_exception', reason: 'bad mapping' },
      },
    } as unknown as BulkResponseRow;
    expect(bulkItemIsOk(item)).toBe(false);
  });

  it('inspects index and create ops too', () => {
    const indexOk = { index: { status: 201 } } as unknown as BulkResponseRow;
    const createErrored = {
      create: { status: 409, error: { type: 'version_conflict_engine_exception' } },
    } as unknown as BulkResponseRow;
    expect(bulkItemIsOk(indexOk)).toBe(true);
    expect(bulkItemIsOk(createErrored)).toBe(false);
  });

  it('returns true when the item has no recognised op (defensive default)', () => {
    // Matches the pre-extraction inline check: `!op?.error` evaluates to
    // `!undefined` = true when `op` is itself undefined.
    expect(bulkItemIsOk({} as BulkResponseRow)).toBe(true);
  });
});
