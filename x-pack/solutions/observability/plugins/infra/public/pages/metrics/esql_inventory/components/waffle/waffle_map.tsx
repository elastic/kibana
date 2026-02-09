/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiEmptyPrompt,
  EuiText,
  EuiLoadingChart,
  EuiProgress,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  EsqlWaffleNode,
  EsqlWaffleResult,
  GroupedWaffleResult,
  LegendConfig,
  ValueFormatter,
} from '../../types';
import { WaffleNode, type WaffleNodeShape } from './waffle_node';
import { LegendGradient } from '../legend';
import { WaffleProvider, type FilterAction } from './waffle_context';
import { WaffleGroupTile } from './waffle_group_tile';
import { HoneycombGrid } from './honeycomb_grid';
import { useContainerSize } from './use_container_size';
import { isGroupedResult, countAllNodes, calculateTileSize } from './waffle_utils';

// ============================================================================
// Types
// ============================================================================

interface WaffleMapProps {
  /** The waffle result data (flat or grouped) */
  result: EsqlWaffleResult | GroupedWaffleResult | null;
  /** Legend configuration for colors */
  legendConfig: LegendConfig;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error message */
  error?: Error | null;
  /** Click handler for nodes */
  onNodeClick?: (node: EsqlWaffleNode) => void;
  /** Optional value formatter for displaying values */
  formatter?: ValueFormatter;
  /** Shape of the nodes (square or hexagon) - defaults to hexagon */
  shape?: WaffleNodeShape;
  /** Callback when shape changes */
  onShapeChange?: (shape: WaffleNodeShape) => void;
  /** Fields used for grouping (needed for filter functionality) */
  groupByFields?: string[];
  /** Filter handler for group values */
  onFilter?: (field: string, value: string, action: FilterAction) => void;
}

// ============================================================================
// Constants
// ============================================================================

const SHAPE_OPTIONS = [
  {
    id: 'hexagon',
    label: i18n.translate('xpack.infra.esqlInventory.waffle.shapeHexagon', {
      defaultMessage: 'Honeycomb',
    }),
    iconType: 'grid',
  },
  {
    id: 'square',
    label: i18n.translate('xpack.infra.esqlInventory.waffle.shapeSquare', {
      defaultMessage: 'Grid',
    }),
    iconType: 'apps',
  },
];

// ============================================================================
// Sub-components
// ============================================================================

interface EmptyStateProps {
  isLoading: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ isLoading }) => {
  if (isLoading) {
    return <EuiEmptyPrompt icon={<EuiLoadingChart size="xl" />} title={<></>} />;
  }

  return (
    <EuiEmptyPrompt
      iconType="visAreaStacked"
      title={
        <h3>
          {i18n.translate('xpack.infra.esqlInventory.waffle.noDataTitle', {
            defaultMessage: 'No data available',
          })}
        </h3>
      }
      body={
        <p>
          {i18n.translate('xpack.infra.esqlInventory.waffle.noDataBody', {
            defaultMessage: 'Select a dimension and metric to visualize your data.',
          })}
        </p>
      }
    />
  );
};

interface ErrorStateProps {
  error: Error;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error }) => (
  <EuiEmptyPrompt
    color="danger"
    iconType="error"
    title={
      <h3>
        {i18n.translate('xpack.infra.esqlInventory.waffle.errorTitle', {
          defaultMessage: 'Error loading data',
        })}
      </h3>
    }
    body={<p>{error.message}</p>}
  />
);

interface SquareGridProps {
  nodes: EsqlWaffleNode[];
}

const SquareGrid: React.FC<SquareGridProps> = ({ nodes }) => {
  const { nodeSize, legendConfig, bounds, shape, onNodeClick } =
    React.useContext(WaffleContextInternal)!;

  return (
    <EuiFlexGroup
      gutterSize="xs"
      wrap
      justifyContent="center"
      alignItems="flexStart"
      responsive={false}
    >
      {nodes.map((node) => (
        <EuiFlexItem key={node.id} grow={false}>
          <WaffleNode
            node={node}
            size={nodeSize}
            legendConfig={legendConfig}
            bounds={bounds}
            onClick={onNodeClick}
            shape={shape}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

// Internal context for SquareGrid and GroupedContent
const WaffleContextInternal = React.createContext<{
  nodeSize: number;
  spacing: number;
  legendConfig: LegendConfig;
  bounds: any;
  shape: WaffleNodeShape;
  onNodeClick?: (node: EsqlWaffleNode) => void;
} | null>(null);

interface GroupedContentProps {
  groups: GroupedWaffleResult['groups'];
  containerWidth: number;
}

/**
 * Calculate optimal box width for a group.
 * Minimum width is based on group name header (truncated at 200px + badge + padding).
 * Can grow larger if hexagon content needs more space.
 */
const calculateGroupWidth = (nodeCount: number, nodeSize: number, spacing: number): number => {
  // Group name header: 200px (truncated text) + 40px (badge) + 24px (padding) = 264px min
  const minWidth = 264;

  if (nodeCount === 0) return minWidth;

  const hexWidth = nodeSize * 0.866; // HEX_WIDTH_RATIO
  const horizontalStep = hexWidth + spacing;

  // For small counts, use exact fit; for larger, aim for 1.5:1 aspect ratio
  let nodesPerRow: number;
  if (nodeCount <= 2) {
    nodesPerRow = nodeCount;
  } else {
    nodesPerRow = Math.ceil(Math.sqrt(nodeCount * 1.5));
  }

  // Calculate hexagon content width
  const hexContentWidth = nodesPerRow * horizontalStep + hexWidth / 2 + 16;

  // Use the larger of min header width or hexagon content width
  return Math.max(minWidth, hexContentWidth);
};

const GroupedContent: React.FC<GroupedContentProps> = ({ groups, containerWidth }) => {
  const { euiTheme } = useEuiTheme();
  const { nodeSize, spacing } = React.useContext(WaffleContextInternal)!;
  const gap = euiTheme.size.xs;

  // Flexbox layout - items size dynamically based on their node count
  return (
    <div
      css={css`
        display: flex;
        flex-wrap: wrap;
        gap: ${gap};
        width: 100%;
        align-items: flex-start;
        align-content: flex-start;
      `}
    >
      {groups.map((group) => {
        const nodeCount = countAllNodes(group);
        const baseWidth = calculateGroupWidth(nodeCount, nodeSize, spacing);

        return (
          <div
            key={group.groupKey}
            css={css`
              flex: 0 0 auto;
              width: ${baseWidth}px;
              max-width: 100%;
            `}
          >
            <WaffleGroupTile group={group} />
          </div>
        );
      })}
    </div>
  );
};

interface NodeCountProps {
  isGrouped: boolean;
  totalNodeCount: number;
  groupCount?: number;
}

const NodeCount: React.FC<NodeCountProps> = ({ isGrouped, totalNodeCount, groupCount = 0 }) => (
  <EuiText size="xs" color="subdued">
    {isGrouped
      ? i18n.translate('xpack.infra.esqlInventory.waffle.groupedNodeCount', {
          defaultMessage:
            '{count} {count, plural, one {item} other {items}} in {groupCount} {groupCount, plural, one {group} other {groups}}',
          values: { count: totalNodeCount, groupCount },
        })
      : i18n.translate('xpack.infra.esqlInventory.waffle.nodeCount', {
          defaultMessage: '{count} {count, plural, one {item} other {items}}',
          values: { count: totalNodeCount },
        })}
  </EuiText>
);

// ============================================================================
// Main Component
// ============================================================================

/**
 * Main waffle map component that renders a grid of tiles.
 * Supports both honeycomb (hexagonal) and grid (square) layouts.
 */
export const WaffleMap: React.FC<WaffleMapProps> = ({
  result,
  legendConfig,
  isLoading = false,
  error = null,
  onNodeClick,
  formatter,
  shape: externalShape,
  onShapeChange,
  groupByFields = [],
  onFilter,
}) => {
  const { euiTheme } = useEuiTheme();
  const { ref: containerRef, size: containerSize } = useContainerSize();
  const [internalShape, setInternalShape] = useState<WaffleNodeShape>('hexagon');

  // Shape management (controlled or uncontrolled)
  const shape = externalShape ?? internalShape;
  const handleShapeChange = useCallback(
    (newShape: string) => {
      const nodeShape = newShape as WaffleNodeShape;
      if (onShapeChange) {
        onShapeChange(nodeShape);
      } else {
        setInternalShape(nodeShape);
      }
    },
    [onShapeChange]
  );

  // Derived state
  const isGrouped = result ? isGroupedResult(result) : false;

  const totalNodeCount = useMemo(() => {
    if (!result) return 0;
    return isGroupedResult(result)
      ? result.groups.reduce((sum, group) => sum + countAllNodes(group), 0)
      : result.nodes.length;
  }, [result]);

  const tileSize = useMemo(() => {
    const calculated = calculateTileSize(
      containerSize.width,
      containerSize.height - 50,
      totalNodeCount,
      shape
    );
    return shape === 'hexagon' ? Math.floor(calculated * 1.2) : calculated;
  }, [containerSize.width, containerSize.height, totalNodeCount, shape]);

  const hasData = useMemo(() => {
    if (!result) return false;
    return isGroupedResult(result)
      ? result.groups.length > 0 && result.groups.some((g) => countAllNodes(g) > 0)
      : result.nodes.length > 0;
  }, [result]);

  const handleNodeClick = useCallback((node: EsqlWaffleNode) => onNodeClick?.(node), [onNodeClick]);

  // Early returns for error/empty states
  if (error && !hasData) {
    return <ErrorState error={error} />;
  }

  if (!hasData) {
    return <EmptyState isLoading={isLoading} />;
  }

  const bounds = isGrouped
    ? (result as GroupedWaffleResult).globalBounds
    : (result as EsqlWaffleResult).bounds;

  return (
    <WaffleProvider
      legendConfig={legendConfig}
      bounds={bounds}
      nodeSize={tileSize}
      shape={shape}
      onNodeClick={handleNodeClick}
      groupByFields={groupByFields}
      onFilter={onFilter}
    >
      <WaffleContextInternal.Provider
        value={{
          nodeSize: tileSize,
          spacing: parseInt(euiTheme.size.xs, 10) || 4,
          legendConfig,
          bounds,
          shape,
          onNodeClick: handleNodeClick,
        }}
      >
        <EuiFlexGroup
          ref={containerRef}
          direction="column"
          gutterSize="s"
          css={css`
            height: 100%;
            width: 100%;
            position: relative;
          `}
        >
          {/* Loading indicator */}
          {isLoading && (
            <EuiProgress
              size="xs"
              color="accent"
              position="absolute"
              css={css`
                top: 0;
                z-index: ${Number(euiTheme.levels.header) - 1};
              `}
            />
          )}

          {/* Legend and controls */}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" wrap gutterSize="s" responsive={false}>
              <EuiFlexItem>
                <LegendGradient legendConfig={legendConfig} bounds={bounds} formatter={formatter} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend={i18n.translate('xpack.infra.esqlInventory.waffle.shapeToggleLegend', {
                    defaultMessage: 'Node shape',
                  })}
                  options={SHAPE_OPTIONS}
                  idSelected={shape}
                  onChange={handleShapeChange}
                  buttonSize="compressed"
                  isIconOnly
                  data-test-subj="esqlWaffleShapeToggle"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          {/* Main content */}
          <EuiFlexItem
            grow
            css={css`
              overflow-y: auto;
              overflow-x: hidden;
            `}
            data-test-subj="esqlWaffleMap"
          >
            {isGrouped ? (
              <GroupedContent
                groups={(result as GroupedWaffleResult).groups}
                containerWidth={containerSize.width}
              />
            ) : shape === 'hexagon' ? (
              <HoneycombGrid
                nodes={(result as EsqlWaffleResult).nodes}
                containerWidth={containerSize.width}
              />
            ) : (
              <SquareGrid nodes={(result as EsqlWaffleResult).nodes} />
            )}
          </EuiFlexItem>

          {/* Footer */}
          <EuiFlexItem grow={false}>
            <NodeCount
              isGrouped={isGrouped}
              totalNodeCount={totalNodeCount}
              groupCount={isGrouped ? (result as GroupedWaffleResult).groups.length : undefined}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </WaffleContextInternal.Provider>
    </WaffleProvider>
  );
};
