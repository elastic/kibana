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

const makePipeline = (overrides: Partial<PipelineStats> = {}): PipelineStats => ({
  name: 'test-pipeline',
  indices: ['logs-endpoint.events-000001'],
  docsCount: 1000,
  failedDocsCount: 0,
  statsAvailable: true,
  categories: ['Endpoint'],
  ...overrides,
});

describe('getContinuityStatus', () => {
  it('returns noData when pipelinesData is undefined', () => {
    expect(getContinuityStatus(undefined, ALL)).toBe('noData');
  });

  it('returns noData when pipelinesData is empty', () => {
    expect(getContinuityStatus([], ALL)).toBe('noData');
  });

  it('returns noData when no pipeline serves an active category', () => {
    const pipelines = [makePipeline({ categories: undefined })];
    expect(getContinuityStatus(pipelines, ALL)).toBe('noData');
  });

  it('returns healthy when categorized pipelines have no critical failures', () => {
    const pipelines = [makePipeline({ docsCount: 1000, failedDocsCount: 0 })];
    expect(getContinuityStatus(pipelines, ALL)).toBe('healthy');
  });

  it('returns actionsRequired when a categorized pipeline has critical failure rate', () => {
    // 2% failure rate — above the 1% threshold
    const pipelines = [makePipeline({ docsCount: 100, failedDocsCount: 2 })];
    expect(getContinuityStatus(pipelines, ALL)).toBe('actionsRequired');
  });

  it('returns healthy when failure rate is exactly below threshold', () => {
    // 0.9% — just under 1%
    const pipelines = [makePipeline({ docsCount: 1000, failedDocsCount: 9 })];
    expect(getContinuityStatus(pipelines, ALL)).toBe('healthy');
  });

  it('ignores uncategorized pipelines when computing status', () => {
    const pipelines = [
      makePipeline({
        name: 'cat',
        docsCount: 100,
        failedDocsCount: 0,
        categories: ['Endpoint'],
      }),
      makePipeline({
        name: 'uncat',
        indices: ['internal-index'],
        docsCount: 100,
        failedDocsCount: 99,
        categories: undefined,
      }),
    ];
    expect(getContinuityStatus(pipelines, ALL)).toBe('healthy');
  });

  it('respects activeCategories filter', () => {
    const pipelines = [
      makePipeline({ docsCount: 100, failedDocsCount: 50, categories: ['Endpoint'] }),
    ];
    // Endpoint excluded from active categories
    expect(getContinuityStatus(pipelines, ['Network'])).toBe('noData');
  });

  it('treats a multi-category pipeline as in-scope for any of its categories', () => {
    const pipelines = [
      makePipeline({
        docsCount: 100,
        failedDocsCount: 50,
        categories: ['Endpoint', 'Network'],
      }),
    ];
    expect(getContinuityStatus(pipelines, ['Network'])).toBe('actionsRequired');
    expect(getContinuityStatus(pipelines, ['Cloud'])).toBe('noData');
  });
});
