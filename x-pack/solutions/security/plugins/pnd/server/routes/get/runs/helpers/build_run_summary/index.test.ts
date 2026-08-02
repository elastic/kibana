/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRunSummary, RUN_SUMMARY_MAX_LENGTH } from '.';

describe('buildRunSummary', () => {
  it('composes a success sentence naming the discovery', () => {
    expect(
      buildRunSummary({ correlationId: 'ad-1', pendingGateCount: 0, status: 'succeeded' })
    ).toEqual('Ran successfully for Attack Discovery ad-1.');
  });

  it('omits the discovery clause when uncorrelated', () => {
    expect(
      buildRunSummary({ correlationId: '', pendingGateCount: 0, status: 'succeeded' })
    ).toEqual('Ran successfully.');
  });

  it('pluralises a multi-gate wait', () => {
    expect(
      buildRunSummary({
        correlationId: 'ad-1',
        pendingGateCount: 2,
        status: 'waiting_for_input',
      })
    ).toEqual('Waiting on 2 human decisions for Attack Discovery ad-1.');
  });

  it('uses the singular for a single-gate wait', () => {
    expect(
      buildRunSummary({
        correlationId: 'ad-1',
        pendingGateCount: 1,
        status: 'waiting_for_input',
      })
    ).toEqual('Waiting on 1 human decision for Attack Discovery ad-1.');
  });

  it('falls back to a generic wait sentence when the gate count is zero', () => {
    expect(
      buildRunSummary({
        correlationId: 'ad-1',
        pendingGateCount: 0,
        status: 'waiting_for_input',
      })
    ).toEqual('Waiting for input for Attack Discovery ad-1.');
  });

  it('includes the failure reason when present', () => {
    expect(
      buildRunSummary({
        correlationId: 'ad-1',
        pendingGateCount: 0,
        reason: 'boom',
        status: 'failed',
      })
    ).toEqual('Run failed for Attack Discovery ad-1: boom');
  });

  it('composes a failure sentence without a reason', () => {
    expect(buildRunSummary({ correlationId: '', pendingGateCount: 0, status: 'failed' })).toEqual(
      'Run failed.'
    );
  });

  it('composes a running sentence', () => {
    expect(
      buildRunSummary({ correlationId: 'ad-1', pendingGateCount: 0, status: 'running' })
    ).toEqual('Running for Attack Discovery ad-1.');
  });

  it('composes a cancelled sentence', () => {
    expect(
      buildRunSummary({ correlationId: '', pendingGateCount: 0, status: 'cancelled' })
    ).toEqual('Run was cancelled.');
  });

  it('composes a timed-out sentence', () => {
    expect(
      buildRunSummary({ correlationId: '', pendingGateCount: 0, status: 'timed_out' })
    ).toEqual('Run timed out.');
  });

  it('clamps an over-long reason to the contract bound', () => {
    const summary = buildRunSummary({
      correlationId: '',
      pendingGateCount: 0,
      reason: 'x'.repeat(RUN_SUMMARY_MAX_LENGTH * 2),
      status: 'failed',
    });

    expect(summary.length).toEqual(RUN_SUMMARY_MAX_LENGTH);
  });
});
