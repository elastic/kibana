/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertEsqlSourcesAllowed } from './assert_esql_sources_allowed';

const allowed = ['logs-aws.*'];

describe('assertEsqlSourcesAllowed', () => {
  it('returns ok for a FROM source covered by the allowlist', () => {
    expect(
      assertEsqlSourcesAllowed(
        'FROM logs-aws.cloudtrail-* | WHERE event.action == "AssumeRole"',
        allowed
      )
    ).toEqual({ ok: true });
  });

  it('returns ok when the source is exactly an allowlist pattern', () => {
    expect(assertEsqlSourcesAllowed('FROM logs-aws.* | LIMIT 1', allowed)).toEqual({ ok: true });
  });

  it('returns not ok for FROM *', () => {
    expect(assertEsqlSourcesAllowed('FROM * | LIMIT 1', allowed)).toEqual({
      ok: false,
      reason: expect.stringContaining('FROM source "*"'),
    });
  });

  it('returns not ok for a source outside the allowlist', () => {
    expect(assertEsqlSourcesAllowed('FROM .kibana-* | LIMIT 1', allowed)).toEqual({
      ok: false,
      reason: expect.stringContaining('.kibana-*'),
    });
  });

  it('returns not ok when any source in a multi-source FROM is outside scope', () => {
    expect(assertEsqlSourcesAllowed('FROM logs-aws.*, .kibana-* | LIMIT 1', allowed)).toEqual({
      ok: false,
      reason: expect.stringContaining('.kibana-*'),
    });
  });

  it('returns not ok for a broader pattern than the allowlist', () => {
    expect(assertEsqlSourcesAllowed('FROM logs-* | LIMIT 1', allowed)).toEqual({
      ok: false,
      reason: expect.stringContaining('logs-*'),
    });
  });

  it('returns not ok when the allowlist is empty', () => {
    expect(assertEsqlSourcesAllowed('FROM logs-aws.* | LIMIT 1', [])).toEqual({
      ok: false,
      reason: 'no allowed index patterns',
    });
  });

  it('returns not ok when the query does not start with FROM', () => {
    expect(assertEsqlSourcesAllowed('ROW a = 1', allowed)).toEqual({
      ok: false,
      reason: 'query must start with a valid FROM',
    });
  });
});
