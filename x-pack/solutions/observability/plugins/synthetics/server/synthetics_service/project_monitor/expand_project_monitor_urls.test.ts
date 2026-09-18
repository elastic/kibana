/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ProjectMonitor } from '../../../common/runtime_types';
import {
  expandProjectMonitorUrls,
  getUrlMonitorId,
  isUrlMonitorForParent,
} from './expand_project_monitor_urls';

const createHttpMonitor = (urls: string | string[]): ProjectMonitor => ({
  id: 'parent-monitor',
  name: 'Parent monitor',
  schedule: 1,
  type: 'http',
  urls,
});

describe('expandProjectMonitorUrls', () => {
  it('creates an independent, stable monitor for each HTTP URL', () => {
    const monitors = expandProjectMonitorUrls([
      createHttpMonitor(['https://example.com/one', 'https://example.com/two']),
    ]);

    expect(monitors).toEqual([
      expect.objectContaining({
        id: getUrlMonitorId('parent-monitor', 'https://example.com/one'),
        urls: 'https://example.com/one',
      }),
      expect.objectContaining({
        id: getUrlMonitorId('parent-monitor', 'https://example.com/two'),
        urls: 'https://example.com/two',
      }),
    ]);

    const reorderedMonitors = expandProjectMonitorUrls([
      createHttpMonitor(['https://example.com/two', 'https://example.com/one']),
    ]);
    expect(reorderedMonitors.map(({ id }) => id)).toEqual([
      getUrlMonitorId('parent-monitor', 'https://example.com/two'),
      getUrlMonitorId('parent-monitor', 'https://example.com/one'),
    ]);
  });

  it('preserves the identity of single-URL monitors', () => {
    expect(expandProjectMonitorUrls([createHttpMonitor('https://example.com')])).toEqual([
      createHttpMonitor('https://example.com'),
    ]);
  });

  it('recognizes generated monitors when deleting a parent monitor', () => {
    expect(
      isUrlMonitorForParent(
        getUrlMonitorId('parent-monitor', 'https://example.com'),
        'parent-monitor'
      )
    ).toBe(true);
  });
});
