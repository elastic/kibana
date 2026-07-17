/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { FixtureFeature } from '../fixtures';
import type { KiNodeData, TypeFilters, VisibleFeatureType } from './types';
import { NODE_DIMENSIONS } from './types';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildGraphElements(
  allFeatures: FixtureFeature[],
  filters: TypeFilters,
  colors: Record<VisibleFeatureType, { fill: string; border: string }>,
  selectedId: string | null
): { nodes: Array<Node<KiNodeData>>; edges: Edge[] } {
  const visibleFeatures = allFeatures.filter(
    (f) => f.type !== 'dependency' && filters[f.type as VisibleFeatureType]
  );
  const entityIds = new Set(visibleFeatures.map((f) => f.id));

  const phantomNodeIds = new Set<string>();
  const edges: Edge[] = [];
  const edgeIds = new Set<string>();

  allFeatures
    .filter((f) => f.type === 'dependency')
    .forEach((dep) => {
      const sourceSlug = slugify((dep.properties as { source?: string }).source || '');
      const targetSlug = dep.dependency_targets?.[0] || slugify((dep.properties as { target?: string }).target || '');

      if (!sourceSlug || !targetSlug || sourceSlug === targetSlug) return;

      const edgeId = `${sourceSlug}->${targetSlug}`;
      if (edgeIds.has(edgeId)) return;
      edgeIds.add(edgeId);

      if (!entityIds.has(sourceSlug)) phantomNodeIds.add(sourceSlug);
      if (!entityIds.has(targetSlug)) phantomNodeIds.add(targetSlug);

      edges.push({
        id: edgeId,
        source: sourceSlug,
        target: targetSlug,
        type: 'default',
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10 },
        style: { strokeWidth: 1, opacity: 0.4 },
      });
    });

  const nodes: Array<Node<KiNodeData>> = visibleFeatures.map((feature) => {
    const type = feature.type as VisibleFeatureType;
    const dims = NODE_DIMENSIONS[type];
    const palette = colors[type];

    return {
      id: feature.id,
      type: 'kiNode',
      position: { x: 0, y: 0 },
      data: {
        feature,
        width: dims.width,
        height: dims.height,
        color: palette.fill,
        borderColor: palette.border,
        selected: selectedId === feature.id,
        isPhantom: false,
      },
    };
  });

  const phantomDims = NODE_DIMENSIONS.entity;
  for (const phantomId of phantomNodeIds) {
    if (entityIds.has(phantomId)) continue;
    nodes.push({
      id: phantomId,
      type: 'kiNode',
      position: { x: 0, y: 0 },
      data: {
        feature: {
          id: phantomId,
          uuid: phantomId,
          stream_name: '',
          type: 'entity',
          subtype: 'external',
          title: phantomId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          description: 'External or unmonitored service',
          properties: {},
          confidence: 0,
          tags: ['phantom'],
        },
        width: phantomDims.width,
        height: phantomDims.height,
        color: 'transparent',
        borderColor: colors.entity.border,
        selected: selectedId === phantomId,
        isPhantom: true,
      },
    });
  }

  return { nodes, edges };
}
