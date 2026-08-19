/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect } from 'react';
import { ReactFlow, MarkerType, useNodesState, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import type { ServiceDependencyEdge } from '../../../common/service_dependencies';
import { applyDagreLayout } from './layout';

interface ServiceEntity {
  'entity.id': string;
  'entity.name': string;
}

interface Props {
  items: ServiceEntity[];
  edges: ServiceDependencyEdge[];
}

/** Strips the "service:" EUID prefix to get a display label. */
const toServiceLabel = (euid: string): string =>
  euid.startsWith('service:') ? euid.slice('service:'.length) : euid;

// Dimensions used for layout spacing and explicit node sizing.
const SERVICE_NODE_SIZE = 140;
const BACKEND_NODE_WIDTH = 160;
const BACKEND_NODE_HEIGHT = 56;

export const ServiceMap = ({ items, edges }: Props) => {
  const { euiTheme } = useEuiTheme();

  const { nodes: layoutNodes, edges: rfEdges } = useMemo(() => {
    // Shared style helpers — defined inside useMemo so they close over euiTheme.
    const serviceNodeStyle: React.CSSProperties = {
      width: SERVICE_NODE_SIZE,
      height: SERVICE_NODE_SIZE,
      borderRadius: '50%',
      border: `2px solid ${euiTheme.colors.primary}`,
      backgroundColor: euiTheme.colors.emptyShade,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '12px',
      boxSizing: 'border-box',
      fontSize: '12px',
      fontWeight: 500,
      lineHeight: 1.3,
      color: euiTheme.colors.title,
      overflowWrap: 'break-word',
      wordBreak: 'break-word',
      boxShadow: `0 2px 8px ${euiTheme.colors.shadow ?? 'rgba(0,0,0,0.12)'}`,
    };

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

    // Start with a node per known service entity.
    const nodeMap = new Map<string, Node>(
      items.map((item) => [
        item['entity.id'],
        {
          id: item['entity.id'],
          position: { x: 0, y: 0 },
          width: SERVICE_NODE_SIZE,
          height: SERVICE_NODE_SIZE,
          style: serviceNodeStyle,
          data: { label: item['entity.name'] },
        },
      ])
    );

    // Ensure every edge endpoint has a node. Back-fill missing service endpoints with a
    // basic node; render backend nodes with a visually distinct style.
    for (const edge of edges) {
      const { source, target, targetKind } = edge;

      if (!nodeMap.has(source)) {
        nodeMap.set(source, {
          id: source,
          position: { x: 0, y: 0 },
          width: SERVICE_NODE_SIZE,
          height: SERVICE_NODE_SIZE,
          style: serviceNodeStyle,
          data: { label: toServiceLabel(source) },
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
            position: { x: 0, y: 0 },
            width: SERVICE_NODE_SIZE,
            height: SERVICE_NODE_SIZE,
            style: serviceNodeStyle,
            data: { label: toServiceLabel(target) },
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
        onNodesChange={onNodesChange}
        fitView
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
};
