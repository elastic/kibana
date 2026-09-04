/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { ResolverNode } from '../../../../../common/endpoint/types';
import { ANALYZER_CROSS_PROJECT_RENDER_EVENT } from '../../../../lib/telemetry/event_based/events';
import {
  countProjectsInResolverNodes,
  reportAnalyzerCrossProjectRender,
} from './cross_project_telemetry';

const node = (index?: string): ResolverNode => ({
  id: 'entity-1',
  data: index ? { _index: index } : {},
  stats: { total: 0, byCategory: {} },
});

describe('countProjectsInResolverNodes', () => {
  it('counts only origin when no hit carries a project prefix', () => {
    expect(countProjectsInResolverNodes([node('logs-endpoint.events-default'), node()])).toEqual({
      projectCount: 1,
      hasLinkedProjectNodes: false,
    });
  });

  it('counts origin plus each distinct linked-project alias', () => {
    expect(
      countProjectsInResolverNodes([
        node('logs-endpoint.events-default'),
        node('linked-a:logs-endpoint.events-default'),
        node('linked-b:logs-endpoint.events-default'),
        node('linked-a:.ds-logs-endpoint.events-default-2024.01.01'),
      ])
    ).toEqual({
      projectCount: 3,
      hasLinkedProjectNodes: true,
    });
  });
});

describe('reportAnalyzerCrossProjectRender', () => {
  let analytics: jest.Mocked<Pick<AnalyticsServiceSetup, 'reportEvent'>>;

  beforeEach(() => {
    analytics = { reportEvent: jest.fn() };
  });

  it('reports the project count when linked-project nodes are present', () => {
    reportAnalyzerCrossProjectRender(analytics as unknown as AnalyticsServiceSetup, [
      node('logs-endpoint.events-default'),
      node('linked-a:logs-endpoint.events-default'),
    ]);

    expect(analytics.reportEvent).toHaveBeenCalledWith(
      ANALYZER_CROSS_PROJECT_RENDER_EVENT.eventType,
      { projectCount: 2 }
    );
  });

  it('does not report when the tree is origin-only', () => {
    reportAnalyzerCrossProjectRender(analytics as unknown as AnalyticsServiceSetup, [
      node('logs-endpoint.events-default'),
      node(),
    ]);

    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('never throws when telemetry reporting fails', () => {
    analytics.reportEvent.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(() =>
      reportAnalyzerCrossProjectRender(analytics as unknown as AnalyticsServiceSetup, [
        node('logs-endpoint.events-default'),
        node('linked-a:logs-endpoint.events-default'),
      ])
    ).not.toThrow();
  });
});
