/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ReactFlow, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { K8sEntity } from '../../../common/k8s_entity';
import { buildTopology } from './build_topology';
import { K8sEntityNode } from './k8s_entity_node';
import { applyDagreLayout } from '../service_map/layout';

// Module-level const so nodeTypes object identity is stable; a fresh object on
// every render remounts every node (same pattern as service_map.tsx).
const nodeTypes = { k8sEntity: K8sEntityNode };

interface Props {
  items: K8sEntity[];
}

/** Ownership-tree topology map for Kubernetes entities.
 *  Edges are derived client-side from the denormalized parent references stored
 *  on each child entity — no additional Elasticsearch query required. */
export const K8sTopologyMap = ({ items }: Props) => {
  const { nodes: rawNodes, edges } = useMemo(() => buildTopology(items), [items]);

  // Apply dagre left-to-right layout. Reuses the same layout function as the
  // service map; nodesep is tighter because namespaces fan out more widely.
  const layoutNodes = useMemo(
    () => applyDagreLayout(rawNodes, edges),

    [rawNodes, edges]
  );

  // useNodesState lets the user drag nodes without them snapping back on re-render.
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  useEffect(() => {
    setNodes(layoutNodes);
  }, [layoutNodes, setNodes]);

  if (items.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="visNetwork"
        title={
          <h3>
            {i18n.translate('xpack.entitiesCaue.k8sMap.empty.title', {
              defaultMessage: 'No Kubernetes entities',
            })}
          </h3>
        }
        body={i18n.translate('xpack.entitiesCaue.k8sMap.empty.body', {
          defaultMessage: 'Start the entity store to begin collecting Kubernetes entities.',
        })}
      />
    );
  }

  return (
    <div style={{ height: 600, width: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
};
