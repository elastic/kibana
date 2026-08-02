/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isStepLevelDeepLink } from '.';

describe('isStepLevelDeepLink', () => {
  it('is true for the step-level link a run parked at exactly one gate gets', () => {
    expect(
      isStepLevelDeepLink(
        '/system-security-watch-deep?tab=executions&executionId=run-1&stepExecutionId=step-exec-1'
      )
    ).toBe(true);
  });

  it('is false for the execution-level link a run with no pending gate gets', () => {
    expect(
      isStepLevelDeepLink('/system-security-watch-deep?tab=executions&executionId=run-1')
    ).toBe(false);
  });

  it('is false for an empty stepExecutionId, which selects nothing', () => {
    expect(
      isStepLevelDeepLink(
        '/system-security-watch-deep?tab=executions&executionId=run-1&stepExecutionId='
      )
    ).toBe(false);
  });

  it('is false for a path with no query string at all', () => {
    expect(isStepLevelDeepLink('/system-security-watch-deep')).toBe(false);
  });

  it('is false for an empty path', () => {
    expect(isStepLevelDeepLink('')).toBe(false);
  });

  it('is false for an absent path, because a row can carry none', () => {
    expect(isStepLevelDeepLink(undefined)).toBe(false);
  });

  it('reads the param even when it is encoded, as the server encodes every segment', () => {
    expect(
      isStepLevelDeepLink(
        '/system-security-watch-deep?tab=executions&executionId=run%3A1&stepExecutionId=step%3Aexec%3A1'
      )
    ).toBe(true);
  });
});
