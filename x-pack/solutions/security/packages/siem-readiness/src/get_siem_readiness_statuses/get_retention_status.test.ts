/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRetentionStatus } from './get_retention_status';
import type { CategoriesResponse, RetentionResponse } from '../types';

const ALL: Array<'Endpoint' | 'Identity' | 'Network' | 'Cloud' | 'Application/SaaS'> = [
  'Endpoint',
  'Identity',
  'Network',
  'Cloud',
  'Application/SaaS',
];

const makeCategories = (
  entries: Array<{ category: string; indexName: string }>
): CategoriesResponse => ({
  rawCategoriesMap: [],
  mainCategoriesMap: entries.map(({ category, indexName }) => ({
    category,
    indices: [{ indexName, docs: 100 }],
  })),
});

const makeRetentionData = (items: RetentionResponse['items']): RetentionResponse => ({ items });

describe('getRetentionStatus', () => {
  it('returns noData when categoriesData is undefined', () => {
    const retention = makeRetentionData([]);
    expect(getRetentionStatus(undefined, retention, ALL)).toBe('noData');
  });

  it('returns noData when retentionData has no items', () => {
    const cats = makeCategories([{ category: 'Endpoint', indexName: '.ds-logs-ep-000001' }]);
    expect(getRetentionStatus(cats, makeRetentionData([]), ALL)).toBe('noData');
  });

  it('returns noData when no retention item matches an active category index', () => {
    const cats = makeCategories([{ category: 'Endpoint', indexName: '.ds-logs-ep-000001' }]);
    const retention = makeRetentionData([
      {
        indexName: 'unrelated-stream',
        isDataStream: true,
        retentionType: null,
        retentionPeriod: null,
        retentionDays: null,
        policyName: null,
        status: 'healthy',
      },
    ]);
    expect(getRetentionStatus(cats, retention, ALL)).toBe('noData');
  });

  it('returns healthy when all categorized items are compliant', () => {
    // category index contains the data stream name as substring
    const cats = makeCategories([{ category: 'Cloud', indexName: '.ds-logs-cloud.stream-000001' }]);
    const retention = makeRetentionData([
      {
        indexName: 'logs-cloud.stream',
        isDataStream: true,
        retentionType: 'ilm',
        retentionPeriod: '400d',
        retentionDays: 400,
        policyName: 'p1',
        status: 'healthy',
      },
    ]);
    expect(getRetentionStatus(cats, retention, ALL)).toBe('healthy');
  });

  it('returns actionsRequired when a categorized item is non-compliant', () => {
    const cats = makeCategories([{ category: 'Cloud', indexName: '.ds-logs-cloud.stream-000001' }]);
    const retention = makeRetentionData([
      {
        indexName: 'logs-cloud.stream',
        isDataStream: true,
        retentionType: 'ilm',
        retentionPeriod: '30d',
        retentionDays: 30,
        policyName: 'p1',
        status: 'non-compliant',
      },
    ]);
    expect(getRetentionStatus(cats, retention, ALL)).toBe('actionsRequired');
  });

  it('respects activeCategories filter', () => {
    const cats = makeCategories([{ category: 'Cloud', indexName: '.ds-logs-cloud.stream-000001' }]);
    const retention = makeRetentionData([
      {
        indexName: 'logs-cloud.stream',
        isDataStream: true,
        retentionType: 'ilm',
        retentionPeriod: '30d',
        retentionDays: 30,
        policyName: 'p1',
        status: 'non-compliant',
      },
    ]);
    // Cloud excluded from active categories
    expect(getRetentionStatus(cats, retention, ['Endpoint'])).toBe('noData');
  });
});
