/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveTriggerType } from './resolve_trigger_type';

describe('resolveTriggerType', () => {
  it.each([
    ['manual', 'manual'],
    ['scheduled', 'scheduled'],
    ['alert', 'alert'],
    ['workflow-step', 'workflow_step'],
  ] as const)('maps the built-in trigger source %s to %s', (triggeredBy, expected) => {
    const result = resolveTriggerType({ context: {}, triggeredBy });

    expect(result).toBe(expected);
  });

  it('returns `event` for a registered trigger id with persisted dispatch evidence', () => {
    const result = resolveTriggerType({
      context: { event: { type: 'created' } },
      triggeredBy: 'cases.caseCreated',
    });

    expect(result).toBe('event');
  });

  it('returns `event` when the only evidence is the persisted dispatch metadata', () => {
    const result = resolveTriggerType({
      context: { metadata: { eventTriggerId: 'cases.caseCreated' } },
      triggeredBy: 'cases.caseCreated',
    });

    expect(result).toBe('event');
  });

  it('returns `other` for a custom provenance string without dispatch evidence', () => {
    const result = resolveTriggerType({ context: {}, triggeredBy: 'evals-run-now' });

    expect(result).toBe('other');
  });

  it('returns `other` for a custom provenance string when the context is absent', () => {
    const result = resolveTriggerType({ context: undefined, triggeredBy: 'evals-run-now' });

    expect(result).toBe('other');
  });

  it('never reads a built-in source as an event, even with an event in the context', () => {
    const result = resolveTriggerType({
      context: { event: { type: 'created' } },
      triggeredBy: 'manual',
    });

    expect(result).toBe('manual');
  });

  it.each([[undefined], ['']])('returns `unknown` when triggeredBy is %p', (triggeredBy) => {
    const result = resolveTriggerType({ context: {}, triggeredBy });

    expect(result).toBe('unknown');
  });
});
