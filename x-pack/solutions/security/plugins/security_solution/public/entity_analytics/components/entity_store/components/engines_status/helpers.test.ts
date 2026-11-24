/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetEntityStoreStatusResponse } from '@kbn/entity-store/common';
import { getEngineProblems, getOverallHealth, toTableComponent } from './helpers';

describe('toTableComponent', () => {
  const task = { id: 'entity_store:v2:extract_entity_task:host:default', installed: true } as const;

  it('marks a v2 task with a last error as red and exposes the error', () => {
    expect(
      toTableComponent({ ...task, resource: 'task', status: 'error', runs: 3, lastError: 'boom' })
    ).toMatchObject({ health: 'red', errors: [{ title: 'error', message: 'boom' }] });
  });

  it('marks a healthy v2 task as green', () => {
    expect(
      toTableComponent({ ...task, resource: 'task', status: 'success', runs: 3, lastError: null })
    ).toMatchObject({ health: 'green' });
  });

  it('keeps components that already report health', () => {
    const component = { ...task, resource: 'index', health: 'yellow' } as const;
    expect(toTableComponent(component)).toBe(component);
  });
});

describe('getOverallHealth', () => {
  type Engine = GetEntityStoreStatusResponse['engines'][number];
  const engine = (overrides: Partial<Engine> = {}): Engine => ({
    type: 'host',
    indexPattern: 'logs-*',
    status: 'started',
    fieldHistoryLength: 10,
    components: [
      { id: 'index-1', installed: true, resource: 'index' },
      {
        id: 'entity_store:v2:extract_entity_task:host:default',
        installed: true,
        resource: 'task',
        status: 'success',
        runs: 4,
        lastError: null,
      },
    ],
    ...overrides,
  });

  it('is healthy when every engine runs and nothing fails', () => {
    expect(getOverallHealth([engine(), engine({ type: 'user' })])).toEqual({
      health: 'healthy',
      problems: [],
    });
  });

  it('reports a failing task with its name and error', () => {
    const failing = engine({
      components: [
        {
          id: 'entity_store:v2:extract_entity_non_priority_task:user:default',
          installed: true,
          resource: 'task',
          status: 'error',
          runs: 9,
          lastError: 'circuit_breaking_exception',
        },
      ],
    });

    expect(getOverallHealth([engine(), failing])).toEqual({
      health: 'problems',
      problems: [
        {
          entityType: 'host',
          source: 'Log extraction (non-priority)',
          message: 'circuit_breaking_exception',
        },
      ],
    });
  });

  it('reports the engine error and missing resources', () => {
    const broken = engine({
      status: 'error',
      error: { message: 'init failed', action: 'init' },
      components: [{ id: 'index-1', installed: false, resource: 'index' }],
    });

    expect(getEngineProblems(broken)).toEqual([
      { entityType: 'host', source: 'Engine', message: 'init failed' },
      { entityType: 'host', source: 'index-1', message: 'Not installed' },
    ]);
  });

  it('is in progress while an engine installs, and stopped when all are stopped', () => {
    expect(getOverallHealth([engine({ status: 'installing' })]).health).toBe('in_progress');
    expect(getOverallHealth([engine({ status: 'stopped' })]).health).toBe('stopped');
  });

  it('puts problems before in progress and stopped', () => {
    const stoppedWithError = engine({ status: 'stopped', error: { message: 'x', action: 'init' } });
    expect(getOverallHealth([stoppedWithError]).health).toBe('problems');
  });
});
