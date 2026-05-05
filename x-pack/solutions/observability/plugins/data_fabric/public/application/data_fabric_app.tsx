/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { FabricNode, DestinationNodeData, SourceNodeData } from './mock_data';
import {
  MOCK_NODES,
  MOCK_EDGES,
  SHIPPER_TYPE_OPTIONS,
  POLICY_OPTIONS,
  STREAM_TYPE_OPTIONS,
  DESTINATION_OPTIONS,
  SUMMARY_STATS,
} from './mock_data';
import { Sidebar } from './components/sidebar/sidebar';
import { SummaryBar } from './components/summary_bar';
import { PipelineGraph } from './components/canvas/pipeline_graph';
import { DetailPanel } from './components/detail_panel/detail_panel';

export interface ActiveFilters {
  shipperTypes: string[];
  policies: string[];
  streamTypes: string[];
  destinations: string[];
}

const EMPTY_FILTERS: ActiveFilters = {
  shipperTypes: [],
  policies: [],
  streamTypes: [],
  destinations: [],
};

const pageStyles = css`
  height: 100%;
  overflow: hidden;
`;

const bodyStyles = css`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const headerStyles = css`
  flex-shrink: 0;
  padding: 16px 24px 12px;
  border-bottom: 1px solid;
  border-bottom-color: var(--euiColorBorderBaseSubdued, #d3dae6);
`;

const contentStyles = css`
  flex: 1;
  overflow: hidden;
  min-height: 0;
`;

const sidebarWrapStyles = css`
  width: 220px;
  flex-shrink: 0;
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid var(--euiBorderColor, #d3dae6);
  padding: 16px;
`;

const canvasWrapStyles = css`
  flex: 1;
  min-width: 0;
  height: 100%;
  position: relative;
`;

export const DataFabricApp = () => {
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const filteredNodes = useMemo<FabricNode[]>(() => {
    return MOCK_NODES.filter((node) => {
      if (node.type === 'transform') return true;

      if (node.type === 'source') {
        const d = node.data as SourceNodeData;
        if (filters.shipperTypes.length > 0 && !filters.shipperTypes.includes(d.shipperType)) {
          return false;
        }
        if (filters.policies.length > 0 && !filters.policies.includes(d.policy)) {
          return false;
        }
        if (filters.streamTypes.length > 0 && !filters.streamTypes.includes(d.streamType)) {
          return false;
        }
      }

      if (node.type === 'destination') {
        const d = node.data as DestinationNodeData;
        if (
          filters.destinations.length > 0 &&
          !filters.destinations.includes(d.destinationType)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [filters]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return MOCK_EDGES.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [filteredNodes]);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
  };

  const handleCloseDetail = () => setSelectedNodeId(null);

  return (
    <EuiPage css={pageStyles}>
      <EuiPageBody css={bodyStyles}>
        <div css={headerStyles}>
          <EuiTitle size="m">
            <h1>Data Fabric</h1>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>Live flows for all streams</p>
          </EuiText>
          <EuiSpacer size="s" />
          <SummaryBar stats={SUMMARY_STATS} />
        </div>

        <EuiFlexGroup gutterSize="none" css={contentStyles} responsive={false}>
          <EuiFlexItem grow={false}>
            <div css={sidebarWrapStyles}>
              <Sidebar
                filters={filters}
                onChange={setFilters}
                shipperTypeOptions={SHIPPER_TYPE_OPTIONS}
                policyOptions={POLICY_OPTIONS}
                streamTypeOptions={STREAM_TYPE_OPTIONS}
                destinationOptions={DESTINATION_OPTIONS}
              />
            </div>
          </EuiFlexItem>

          <EuiFlexItem css={canvasWrapStyles}>
            <PipelineGraph
              nodes={filteredNodes}
              edges={filteredEdges}
              selectedNodeId={selectedNodeId}
              onNodeClick={handleNodeClick}
              onPaneClick={handleCloseDetail}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        {selectedNodeId && (
          <DetailPanel nodeId={selectedNodeId} onClose={handleCloseDetail} />
        )}
      </EuiPageBody>
    </EuiPage>
  );
};
