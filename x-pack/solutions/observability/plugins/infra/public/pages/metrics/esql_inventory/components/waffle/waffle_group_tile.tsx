/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { WaffleGroup } from '../../types';
import { WaffleNode } from './waffle_node';
import { GroupName } from './group_name';
import { useWaffleContext } from './waffle_context';
import { useContainerWidth } from './use_container_size';
import { useHoneycombLayout } from './use_honeycomb_layout';
import { countAllNodes } from './waffle_utils';

interface WaffleGroupTileProps {
  /** Group data to render */
  group: WaffleGroup;
  /** Nesting depth level (0 = root) */
  depth?: number;
}

/**
 * Component for rendering a single group as a waffle-style tile.
 * Supports nested subgroups and both honeycomb and grid layouts.
 */
export const WaffleGroupTile: React.FC<WaffleGroupTileProps> = ({ group, depth = 0 }) => {
  const { euiTheme } = useEuiTheme();
  const { nodeSize, spacing, shape, legendConfig, bounds, onNodeClick, groupByFields, onFilter } =
    useWaffleContext();
  const { ref, width: measuredWidth } = useContainerWidth(250);

  const hasSubgroups = group.subgroups && group.subgroups.length > 0;
  const totalNodeCount = countAllNodes(group);
  const isChild = depth > 0;
  const isHexagon = shape === 'hexagon';

  // Get the field name for this depth level
  const fieldName = groupByFields[depth];

  // Use measured width (minus padding) for honeycomb calculation
  const gridContainerWidth = Math.max(measuredWidth - 16, 100);

  const { positions, gridWidth, gridHeight } = useHoneycombLayout(
    hasSubgroups ? [] : group.nodes,
    nodeSize,
    spacing,
    gridContainerWidth
  );

  return (
    <div
      ref={ref}
      css={css`
        width: 100%;
      `}
    >
      <GroupName
        name={group.groupKey}
        count={totalNodeCount}
        isChild={isChild}
        fieldName={fieldName}
        onFilter={onFilter}
      />

      <EuiPanel
        element="div"
        role="list"
        paddingSize="none"
        hasShadow={false}
        hasBorder
        css={css`
          background-color: ${euiTheme.colors.lightestShade};
          padding: ${euiTheme.size.xs};
          padding-top: ${euiTheme.size.m};
        `}
      >
        {hasSubgroups ? (
          // Flexbox layout for nested groups
          <div
            css={css`
              display: flex;
              flex-wrap: wrap;
              gap: ${euiTheme.size.xs};
              align-items: flex-start;
            `}
          >
            {group.subgroups!.map((subgroup) => (
              <WaffleGroupTile key={subgroup.groupKey} group={subgroup} depth={depth + 1} />
            ))}
          </div>
        ) : isHexagon ? (
          // Honeycomb layout requires absolute positioning, centered in container
          <div
            css={css`
              display: flex;
              justify-content: center;
            `}
          >
            <div
              css={css`
                position: relative;
                width: ${gridWidth}px;
                height: ${gridHeight}px;
              `}
            >
              {positions.map(({ node, x, y }) => (
                <div
                  key={node.id}
                  css={css`
                    position: absolute;
                    left: ${x}px;
                    top: ${y}px;
                  `}
                >
                  <WaffleNode
                    node={node}
                    size={nodeSize}
                    legendConfig={legendConfig}
                    bounds={bounds}
                    onClick={onNodeClick}
                    shape={shape}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Square grid uses EuiFlexGroup
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {group.nodes.map((node) => (
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
        )}
      </EuiPanel>
    </div>
  );
};
