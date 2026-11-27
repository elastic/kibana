/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSourceTaskPath } from './source_task';

describe('getSourceTaskPath', () => {
  it('uses the canonical agent-scoped route when both ids are known', () => {
    expect(getSourceTaskPath('conv-1', 'nightshift.investigation')).toBe(
      '/app/agent_builder/agents/nightshift.investigation/conversations/conv-1'
    );
  });

  it('falls back to the legacy unscoped route without an agent id', () => {
    expect(getSourceTaskPath('conv-1', undefined)).toBe('/app/agent_builder/conversations/conv-1');
    expect(getSourceTaskPath('conv-1', '')).toBe('/app/agent_builder/conversations/conv-1');
  });

  it('encodes the segments, so an id with a slash cannot address another route', () => {
    expect(getSourceTaskPath('a/b', 'c/d')).toBe(
      '/app/agent_builder/agents/c%2Fd/conversations/a%2Fb'
    );
  });
});
