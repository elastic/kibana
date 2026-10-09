/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSpecFailureSeed,
  hasUnresolvedFailures,
  routeGroupFailure,
} from './group_failure_routing';

describe('spec failure seeding', () => {
  it('leaves no unresolved failures after a normal interactive close', () => {
    const failed: string[] = [];
    failed.push(...getSpecFailureSeed(true, 'a.cy.ts'));

    expect(failed).toEqual([]);
    expect(hasUnresolvedFailures(failed, false)).toBe(false);
  });

  it('keeps a run spec unresolved when no result was routed', () => {
    const failed: string[] = [];
    failed.push(...getSpecFailureSeed(false, 'a.cy.ts'));

    expect(failed).toEqual(['a.cy.ts']);
    expect(hasUnresolvedFailures(failed, false)).toBe(true);
  });

  it('still fails when interactive group setup throws before any spec starts', () => {
    const failed: string[] = getSpecFailureSeed(true, 'a.cy.ts');
    const infraFailed: string[] = [];
    const records = routeGroupFailure({
      specFilePaths: ['a.cy.ts'],
      failedSpecFilePaths: failed,
      infraFailedSpecFilePaths: infraFailed,
      message: 'setup failed',
      isRetryRun: false,
    });

    expect(failed).toEqual(['a.cy.ts']);
    expect(infraFailed).toEqual(['a.cy.ts']);
    expect(records).toEqual([
      {
        spec: 'a.cy.ts',
        kind: 'runner_failure',
        status: 'thrown',
        message: 'setup failed',
        isRetryRun: false,
      },
    ]);
    expect(hasUnresolvedFailures(failed, false)).toBe(true);
  });
  it('routes no unresolved failures when a teardown error follows a normal interactive close', () => {
    const failed: string[] = getSpecFailureSeed(true, 'a.cy.ts');
    const infraFailed: string[] = [];
    const records = routeGroupFailure({
      specFilePaths: ['a.cy.ts'],
      completedSpecFilePaths: ['a.cy.ts'],
      failedSpecFilePaths: failed,
      infraFailedSpecFilePaths: infraFailed,
      message: 'Elasticsearch failed to stop cleanly',
      isRetryRun: false,
    });

    expect(records).toEqual([]);
    expect(failed).toEqual([]);
    expect(infraFailed).toEqual([]);
    expect(hasUnresolvedFailures(failed, false)).toBe(false);
  });
});

describe('hasUnresolvedFailures', () => {
  it('fails when an initial failure remains after an unrelated successful retry', () => {
    expect(hasUnresolvedFailures(['failed.cy.ts'], false)).toBe(true);
  });
  it('fails on retry failures even without tracked specs', () => {
    expect(hasUnresolvedFailures([], true)).toBe(true);
  });
  it('passes when all specs and retries succeeded', () => {
    expect(hasUnresolvedFailures([], false)).toBe(false);
  });
});

const SPEC_A = '/kibana/x-pack/solutions/security/test/a.cy.ts';
const SPEC_B = '/kibana/x-pack/solutions/security/test/b.cy.ts';
const SPEC_C = '/kibana/x-pack/solutions/security/test/c.cy.ts';
const UNRELATED_SPEC = '/kibana/x-pack/solutions/security/test/other-group.cy.ts';
const STARTUP_MESSAGE = 'Kibana failed to start on port 5620';

describe('routeGroupFailure', () => {
  it('does not requeue passed specs after a later group failure', () => {
    const failedSpecFilePaths = [SPEC_B];
    const infraFailedSpecFilePaths: string[] = [];
    const records = routeGroupFailure({
      specFilePaths: [SPEC_A, SPEC_B, SPEC_C],
      completedSpecFilePaths: [SPEC_A],
      failedSpecFilePaths,
      infraFailedSpecFilePaths,
      message: STARTUP_MESSAGE,
      isRetryRun: false,
    });
    expect(failedSpecFilePaths).toEqual([SPEC_B, SPEC_C]);
    expect(infraFailedSpecFilePaths).toEqual([SPEC_B, SPEC_C]);
    expect(records.map(({ spec }) => spec)).toEqual([SPEC_B, SPEC_C]);
  });
  it('seeds both failure lists and emits a record per spec when the throw precedes the per-spec loop', () => {
    // The startup-failure shape: `runElasticsearch` / `runKibanaServer` /
    // `providers.loadAll()` / `FunctionalTestRunner.run` threw, so nothing has
    // seeded `failedSpecFilePaths` yet and it is still empty here.
    const failedSpecFilePaths: string[] = [];
    const infraFailedSpecFilePaths: string[] = [];

    const records = routeGroupFailure({
      specFilePaths: [SPEC_A, SPEC_B, SPEC_C],
      failedSpecFilePaths,
      infraFailedSpecFilePaths,
      message: STARTUP_MESSAGE,
      isRetryRun: false,
    });

    expect(failedSpecFilePaths).toEqual([SPEC_A, SPEC_B, SPEC_C]);
    expect(infraFailedSpecFilePaths).toEqual([SPEC_A, SPEC_B, SPEC_C]);
    expect(records).toHaveLength(3);

    // The final exit check in parallel.ts is
    // `failedSpecFilePaths.length > 0 || hasFailedRetryTests`. Before this
    // unconditional seeding the array stayed empty and the job reported green.
    expect(failedSpecFilePaths.length > 0).toBe(true);
  });

  it('emits one runner_failure record per spec with the thrown status and message', () => {
    const records = routeGroupFailure({
      specFilePaths: [SPEC_A, SPEC_B],
      failedSpecFilePaths: [],
      infraFailedSpecFilePaths: [],
      message: STARTUP_MESSAGE,
      isRetryRun: false,
    });

    expect(records).toEqual([
      {
        spec: SPEC_A,
        kind: 'runner_failure',
        status: 'thrown',
        message: STARTUP_MESSAGE,
        isRetryRun: false,
      },
      {
        spec: SPEC_B,
        kind: 'runner_failure',
        status: 'thrown',
        message: STARTUP_MESSAGE,
        isRetryRun: false,
      },
    ]);
  });

  it('does not duplicate specs already seeded by a throw inside the per-spec loop', () => {
    // Throw part-way through the loop: the first spec was already pushed to
    // both arrays, the other two were not.
    const failedSpecFilePaths: string[] = [SPEC_A];
    const infraFailedSpecFilePaths: string[] = [SPEC_A];

    const records = routeGroupFailure({
      specFilePaths: [SPEC_A, SPEC_B, SPEC_C],
      failedSpecFilePaths,
      infraFailedSpecFilePaths,
      message: STARTUP_MESSAGE,
      isRetryRun: false,
    });

    expect(failedSpecFilePaths).toEqual([SPEC_A, SPEC_B, SPEC_C]);
    expect(infraFailedSpecFilePaths).toEqual([SPEC_A, SPEC_B, SPEC_C]);
    expect(records).toHaveLength(3);
  });

  it('preserves unrelated entries already present in the failure lists', () => {
    const failedSpecFilePaths: string[] = [UNRELATED_SPEC];
    const infraFailedSpecFilePaths: string[] = [UNRELATED_SPEC];

    routeGroupFailure({
      specFilePaths: [SPEC_A],
      failedSpecFilePaths,
      infraFailedSpecFilePaths,
      message: STARTUP_MESSAGE,
      isRetryRun: false,
    });

    expect(failedSpecFilePaths).toEqual([UNRELATED_SPEC, SPEC_A]);
    expect(infraFailedSpecFilePaths).toEqual([UNRELATED_SPEC, SPEC_A]);
  });

  it('propagates isRetryRun onto records emitted by the infra-retry pass', () => {
    const records = routeGroupFailure({
      specFilePaths: [SPEC_A],
      failedSpecFilePaths: [],
      infraFailedSpecFilePaths: [],
      message: STARTUP_MESSAGE,
      isRetryRun: true,
    });

    expect(records).toEqual([
      {
        spec: SPEC_A,
        kind: 'runner_failure',
        status: 'thrown',
        message: STARTUP_MESSAGE,
        isRetryRun: true,
      },
    ]);
  });

  it('is a no-op for an empty group', () => {
    const failedSpecFilePaths: string[] = [];
    const infraFailedSpecFilePaths: string[] = [];

    const records = routeGroupFailure({
      specFilePaths: [],
      failedSpecFilePaths,
      infraFailedSpecFilePaths,
      message: STARTUP_MESSAGE,
      isRetryRun: false,
    });

    expect(records).toEqual([]);
    expect(failedSpecFilePaths).toEqual([]);
    expect(infraFailedSpecFilePaths).toEqual([]);
  });
});
