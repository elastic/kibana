/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect } from 'react';
import { ReactFlow, MarkerType, useNodesState, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { EuiEmptyPrompt, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ServiceDependencyEdge } from '../../../common/service_dependencies';
import type { ServiceEntity } from '../../../common/service_entity';
import { applyDagreLayout } from './layout';
import { ServiceNode, SERVICE_NODE_SIZE } from './service_node';

// Module-level const — a new object identity on every render makes ReactFlow re-mount all nodes.
const nodeTypes = { service: ServiceNode };

const BACKEND_NODE_WIDTH = 160;
const BACKEND_NODE_HEIGHT = 56;

/** Strips the "service:" EUID prefix to get a display label. */
const toServiceLabel = (euid: string): string =>
  euid.startsWith('service:') ? euid.slice('service:'.length) : euid;

interface Props {
  items: ServiceEntity[];
  edges: ServiceDependencyEdge[];
}

export const ServiceMap = ({ items, edges }: Props) => {
  const { euiTheme } = useEuiTheme();

  const { nodes: layoutNodes, edges: rfEdges } = useMemo(() => {
    // Quick lookup from entity.id → health fields for the nodes seeded from items.
    const healthByEntityId = new Map(
      items.map((item) => [
        item['entity.id'],
        {
          level: item['service.health.calculated_level'],
          scoreNorm: item['service.health.calculated_score_norm'],
        },
      ])
    );

    const backendNodeStyle: React.CSSProperties = {
      width: BACKEND_NODE_WIDTH,
      height: BACKEND_NODE_HEIGHT,
      borderRadius: euiTheme.border.radius.medium,
      border: `2px dashed ${euiTheme.colors.mediumShade}`,
      backgroundColor: euiTheme.colors.lightShade,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '8px',
      boxSizing: 'border-box',
      fontSize: '12px',
      lineHeight: 1.3,
      color: euiTheme.colors.text,
      overflowWrap: 'break-word',
      wordBreak: 'break-word',
    };

    // Start with a node per known service entity, carrying health data.
    const nodeMap = new Map<string, Node>(
      items.map((item) => {
        const health = healthByEntityId.get(item['entity.id']);
        return [
          item['entity.id'],
          {
            id: item['entity.id'],
            type: 'service',
            position: { x: 0, y: 0 },
            width: SERVICE_NODE_SIZE,
            height: SERVICE_NODE_SIZE,
            data: {
              label: item['entity.name'],
              level: health?.level ?? null,
              scoreNorm: health?.scoreNorm ?? null,
            },
          },
        ];
      })
    );

    // Ensure every edge endpoint has a node. Back-fill missing service endpoints with a
    // basic node (health unknown — they aren't in the entity store yet);
    // render backend nodes with a visually distinct style.
    for (const edge of edges) {
      const { source, target, targetKind } = edge;

      if (!nodeMap.has(source)) {
        nodeMap.set(source, {
          id: source,
          type: 'service',
          position: { x: 0, y: 0 },
          width: SERVICE_NODE_SIZE,
          height: SERVICE_NODE_SIZE,
          data: { label: toServiceLabel(source), level: null, scoreNorm: null },
        });
      }

      if (!nodeMap.has(target)) {
        if (targetKind === 'backend') {
          // Backend nodes: caller-agnostic id (two services calling elasticsearch share one node).
          // Rendered as a dashed rectangle to visually separate them from service circles.
          nodeMap.set(target, {
            id: target,
            position: { x: 0, y: 0 },
            width: BACKEND_NODE_WIDTH,
            height: BACKEND_NODE_HEIGHT,
            style: backendNodeStyle,
            data: { label: target },
          });
        } else {
          nodeMap.set(target, {
            id: target,
            type: 'service',
            position: { x: 0, y: 0 },
            width: SERVICE_NODE_SIZE,
            height: SERVICE_NODE_SIZE,
            data: { label: toServiceLabel(target), level: null, scoreNorm: null },
          });
        }
      }
    }

    const rfEdgesRaw: Edge[] = edges.map(({ source, target }) => ({
      id: `${source}~${target}`,
      source,
      target,
      markerEnd: { type: MarkerType.ArrowClosed },
    }));

    const laidOutNodes = applyDagreLayout([...nodeMap.values()], rfEdgesRaw);

    return { nodes: laidOutNodes, edges: rfEdgesRaw };
  }, [items, edges, euiTheme]);

  // useNodesState gives ReactFlow an onNodesChange handler so drag position
  // updates are applied back to state — without it nodes snap back on release.
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);

  // Re-sync when the layout changes (e.g. new data loaded).
  useEffect(() => {
    setNodes(layoutNodes);
  }, [layoutNodes, setNodes]);

  if (items.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="visNetwork"
        title={
          <h2>
            {i18n.translate('xpack.entitiesCaue.serviceMap.empty.title', {
              defaultMessage: 'No services found',
            })}
          </h2>
        }
        body={i18n.translate('xpack.entitiesCaue.serviceMap.empty.body', {
          defaultMessage:
            'Service entities will appear here once the entity store has indexed them.',
        })}
      />
    );
  }

  return (
    <div style={{ height: 600, width: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
};
