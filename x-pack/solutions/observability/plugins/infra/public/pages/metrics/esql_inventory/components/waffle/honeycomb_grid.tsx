/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { EsqlWaffleNode } from '../../types';
import { WaffleNode } from './waffle_node';
import { useWaffleContext } from './waffle_context';
import { useContainerWidth } from './use_container_size';
import { useHoneycombLayout } from './use_honeycomb_layout';

interface HoneycombGridProps {
  /** Nodes to render in the grid */
  nodes: EsqlWaffleNode[];
  /** Initial container width hint */
  containerWidth?: number;
}

/**
 * Honeycomb grid component - arranges pointy-topped hexagons in a proper honeycomb pattern.
 *
 * Layout:
 * Row 0:  /\  /\  /\  /\
 *        |  ||  ||  ||  |
 *         \/  \/  \/  \/
 * Row 1:    /\  /\  /\
 *          |  ||  ||  |
 *           \/  \/  \/
 */
export const HoneycombGrid: React.FC<HoneycombGridProps> = ({
  nodes,
  containerWidth: initialWidth = 300,
}) => {
  const { nodeSize, spacing, legendConfig, bounds, onNodeClick } = useWaffleContext();
  const { ref, width: measuredWidth } = useContainerWidth(initialWidth);
  const effectiveWidth = Math.max(measuredWidth, initialWidth);

  const { positions, gridWidth, gridHeight } = useHoneycombLayout(
    nodes,
    nodeSize,
    spacing,
    effectiveWidth
  );

  return (
    <EuiFlexGroup
      ref={ref}
      justifyContent="center"
      responsive={false}
      css={css`
        width: 100%;
        padding: ${nodeSize * 0.1}px;
      `}
    >
      <EuiFlexItem
        grow={false}
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
              shape="hexagon"
            />
          </div>
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
