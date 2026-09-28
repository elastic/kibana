/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import { firstNonNullValue } from '../../../../../common/endpoint/models/ecs_safety_helpers';
import type { ResolverNode } from '../../../../../common/endpoint/types';
import { isFannedInHit } from '../../../utils/cps_read_routing';
import { ANALYZER_CROSS_PROJECT_RENDER_EVENT } from '../../../../lib/telemetry/event_based/events';

const ORIGIN_PROJECT = '_origin';

/**
 * Unique projects represented in a resolver tree. Origin hits count as `_origin`; linked-project
 * hits contribute their `_index` alias prefix. Counts only — no document content.
 */
export function countProjectsInResolverNodes(nodes: ResolverNode[]): {
  projectCount: number;
  hasLinkedProjectNodes: boolean;
} {
  const projects = new Set<string>();

  for (const node of nodes) {
    const index = firstNonNullValue(node.data._index);
    if (typeof index === 'string' && isFannedInHit(index)) {
      projects.add(index.slice(0, index.indexOf(':')));
    } else {
      projects.add(ORIGIN_PROJECT);
    }
  }

  const hasLinkedProjectNodes = [...projects].some((project) => project !== ORIGIN_PROJECT);

  return { projectCount: projects.size, hasLinkedProjectNodes };
}

export function reportAnalyzerCrossProjectRender(
  analytics: AnalyticsServiceSetup,
  nodes: ResolverNode[]
): void {
  const { projectCount, hasLinkedProjectNodes } = countProjectsInResolverNodes(nodes);
  if (!hasLinkedProjectNodes) {
    return;
  }

  try {
    analytics.reportEvent(ANALYZER_CROSS_PROJECT_RENDER_EVENT.eventType, {
      projectCount,
    });
  } catch {
    // Telemetry must never fail a resolver response.
  }
}
