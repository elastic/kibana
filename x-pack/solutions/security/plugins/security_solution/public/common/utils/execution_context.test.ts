/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildExecutionContext, EA_EXECUTION_CONTEXT_NAMES } from './execution_context';

describe('buildExecutionContext', () => {
  it('returns a child execution context tagged as security_solution', () => {
    expect(buildExecutionContext('entity_analytics:home_page', 'entities_table')).toEqual({
      child: {
        type: 'security_solution',
        name: 'entity_analytics:home_page',
        id: 'entities_table',
      },
    });
  });

  it('preserves the name and id verbatim so trace labels match the caller', () => {
    const ctx = buildExecutionContext('entity_analytics:explore-hosts_page', 'hosts_all');
    expect(ctx.child.name).toBe('entity_analytics:explore-hosts_page');
    expect(ctx.child.id).toBe('hosts_all');
  });

  it('returns independent contexts for calls with identical labels', () => {
    const firstContext = buildExecutionContext('entity_analytics:home_page', 'entities_table');
    const secondContext = buildExecutionContext('entity_analytics:home_page', 'entities_table');

    expect(firstContext).not.toBe(secondContext);
    expect(firstContext.child).not.toBe(secondContext.child);
    expect(firstContext).toEqual(secondContext);
  });
});

describe('EA_EXECUTION_CONTEXT_NAMES', () => {
  it.each(Object.entries(EA_EXECUTION_CONTEXT_NAMES))(
    'prefixes %s with entity_analytics:',
    (_key, value) => {
      expect(value).toMatch(/^entity_analytics:/);
    }
  );

  it('ENTITY_RESOLUTION resolves to the exact expected string', () => {
    expect(EA_EXECUTION_CONTEXT_NAMES.ENTITY_RESOLUTION).toBe('entity_analytics:entity_resolution');
  });

  it('ENTITY_STORE_MANAGEMENT resolves to the exact expected string', () => {
    expect(EA_EXECUTION_CONTEXT_NAMES.ENTITY_STORE_MANAGEMENT).toBe(
      'entity_analytics:entity_store_management'
    );
  });

  it('ASSET_CRITICALITY resolves to the exact expected string', () => {
    expect(EA_EXECUTION_CONTEXT_NAMES.ASSET_CRITICALITY).toBe('entity_analytics:asset_criticality');
  });

  it('HOME_PAGE resolves to the exact expected string', () => {
    expect(EA_EXECUTION_CONTEXT_NAMES.HOME_PAGE).toBe('entity_analytics:home_page');
  });

  it('RISK_SCORE_MANAGEMENT resolves to the exact expected string', () => {
    expect(EA_EXECUTION_CONTEXT_NAMES.RISK_SCORE_MANAGEMENT).toBe(
      'entity_analytics:risk_score_management'
    );
  });
});
