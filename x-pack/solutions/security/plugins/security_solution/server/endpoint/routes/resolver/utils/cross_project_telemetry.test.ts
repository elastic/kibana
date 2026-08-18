/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolverNode } from '../../../../../common/endpoint/types';
import { countProjectsInResolverNodes } from './cross_project_telemetry';

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
