/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getContinuityStatus } from './get_continuity_status';
import type { PipelineStats } from '../types';

const ALL: Array<'Endpoint' | 'Identity' | 'Network' | 'Cloud' | 'Application/SaaS'> = [
  'Endpoint',
  'Identity',
  'Network',
  'Cloud',
  'Application/SaaS',
];

const makeMap = (entries: Record<string, string> = {}): Map<string, string> =>
  new Map(Object.entries(entries));

const makePipeline = (overrides: Partial<PipelineStats> = {}): PipelineStats => ({
  name: 'test-pipeline',
  indices: ['logs-endpoint.events-000001'],
  docsCount: 1000,
  failedDocsCount: 0,
  statsAvailable: true,
  ...overrides,
});

describe('getContinuityStatus', () => {
  it('returns noData when pipelinesData is undefined', () => {
    expect(getContinuityStatus(undefined, makeMap(), ALL)).toBe('noData');
  });

  it('returns noData when pipelinesData is empty', () => {
    expect(getContinuityStatus([], makeMap(), ALL)).toBe('noData');
  });

  it('returns noData when no pipeline serves an active-category index', () => {
    const pipelines = [makePipeline({ indices: ['internal-index'] })];
    const map = makeMap({ 'some-other-index': 'Endpoint' });
    expect(getContinuityStatus(pipelines, map, ALL)).toBe('noData');
  });

  it('returns healthy when categorized pipelines have no critical failures', () => {
    const pipelines = [makePipeline({ docsCount: 1000, failedDocsCount: 0 })];
    const map = makeMap({ 'logs-endpoint.events-000001': 'Endpoint' });
    expect(getContinuityStatus(pipelines, map, ALL)).toBe('healthy');
  });

  it('returns actionsRequired when a categorized pipeline has critical failure rate', () => {
    // 2% failure rate — above the 1% threshold
    const pipelines = [makePipeline({ docsCount: 100, failedDocsCount: 2 })];
    const map = makeMap({ 'logs-endpoint.events-000001': 'Endpoint' });
    expect(getContinuityStatus(pipelines, map, ALL)).toBe('actionsRequired');
  });

  it('returns healthy when failure rate is exactly below threshold', () => {
    // 0.9% — just under 1%
    const pipelines = [makePipeline({ docsCount: 1000, failedDocsCount: 9 })];
    const map = makeMap({ 'logs-endpoint.events-000001': 'Endpoint' });
    expect(getContinuityStatus(pipelines, map, ALL)).toBe('healthy');
  });

  it('ignores uncategorized pipelines when computing status', () => {
    const pipelines = [
      makePipeline({
        name: 'cat',
        indices: ['logs-endpoint.events-000001'],
        docsCount: 100,
        failedDocsCount: 0,
      }),
      makePipeline({
        name: 'uncat',
        indices: ['internal-index'],
        docsCount: 100,
        failedDocsCount: 99,
      }),
    ];
    const map = makeMap({ 'logs-endpoint.events-000001': 'Endpoint' });
    expect(getContinuityStatus(pipelines, map, ALL)).toBe('healthy');
  });

  it('respects activeCategories filter', () => {
    const pipelines = [makePipeline({ docsCount: 100, failedDocsCount: 50 })];
    const map = makeMap({ 'logs-endpoint.events-000001': 'Endpoint' });
    // Endpoint excluded from active categories
    expect(getContinuityStatus(pipelines, map, ['Network'])).toBe('noData');
  });
});
