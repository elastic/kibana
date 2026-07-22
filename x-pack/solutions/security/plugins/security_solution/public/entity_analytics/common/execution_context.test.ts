/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildExecutionContext } from './execution_context';

describe('buildExecutionContext', () => {
  it('returns a child execution context tagged as security_solution', () => {
    expect(buildExecutionContext('entity_analytics-home_page', 'entities_table')).toEqual({
      child: {
        type: 'security_solution',
        name: 'entity_analytics-home_page',
        id: 'entities_table',
      },
    });
  });

  it('preserves the name and id verbatim so trace labels match the caller', () => {
    const ctx = buildExecutionContext('explore-hosts_page', 'hosts_all');
    expect(ctx.child.name).toBe('explore-hosts_page');
    expect(ctx.child.id).toBe('hosts_all');
  });
});
