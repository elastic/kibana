/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveTargetContext } from './resolve_target_context';

describe('resolveTargetContext', () => {
  it('prefers serverless project id', () => {
    expect(
      resolveTargetContext({
        cloudSetup: { isServerlessEnabled: true, serverless: { projectId: 'proj-1' } },
      })
    ).toEqual({ targetType: 'serverless', targetId: 'proj-1' });
  });

  it('uses deployment id for hosted', () => {
    expect(resolveTargetContext({ cloudSetup: { deploymentId: 'dep-1' } })).toEqual({
      targetType: 'hosted',
      targetId: 'dep-1',
    });
  });

  it('falls back to config values when cloud metadata is absent', () => {
    expect(resolveTargetContext({ config: { targetType: 'hosted', targetId: 'cfg-1' } })).toEqual({
      targetType: 'hosted',
      targetId: 'cfg-1',
    });
  });

  it('returns undefined when nothing resolves', () => {
    expect(resolveTargetContext({})).toBeUndefined();
    expect(resolveTargetContext({ config: { targetType: 'hosted' } })).toBeUndefined();
  });
});
