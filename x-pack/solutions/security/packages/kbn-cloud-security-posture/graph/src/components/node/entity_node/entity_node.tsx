/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useDetailLevel } from '../../detail_level';
import { EntityNodeDetailed } from './entity_node_detailed';
import { EntityNodeSimplified } from './entity_node_simplified';
import type { EntityNodeViewModel, NodeProps } from '../../types';
import {
  EntityNodeContainer,
  EntityNodeContent,
  EntityNodeExpandButtonWrapper,
  HandleStyleOverride,
  NodeButton,
} from '../styles';
import { NodeExpandButton } from '../node_expand_button';
import { GRAPH_ENTITY_NODE_ID } from '../../test_ids';

export const EntityNode = memo<NodeProps>((props: NodeProps) => {
  const data = props.data as EntityNodeViewModel;
  const { color, interactive, expandButtonClick, nodeClick } = data;
  const level = useDetailLevel();
  // Non-interactive previews always render simplified; interactive graphs follow zoom level
  const isSimplified = !interactive || level === 'simplified';

  return (
    <EntityNodeContainer isSimplified={isSimplified} data-test-subj={GRAPH_ENTITY_NODE_ID}>
      <EntityNodeContent>
        {isSimplified ? <EntityNodeSimplified data={data} /> : <EntityNodeDetailed data={data} />}
        {interactive ? (
          <>
            <NodeButton
              onClick={(e) => nodeClick?.(e, props)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            />
            <EntityNodeExpandButtonWrapper>
              <NodeExpandButton
                color={color}
                filled
                onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
              />
            </EntityNodeExpandButtonWrapper>
          </>
        ) : null}
      </EntityNodeContent>
      {/* Handles anchor to the fixed reserved footprint (not the content), so edge
          endpoints stay put when the node switches between detailed and simplified. */}
      <Handle
        type="target"
        isConnectable={false}
        position={Position.Left}
        id="in"
        style={HandleStyleOverride}
      />
      <Handle
        type="source"
        isConnectable={false}
        position={Position.Right}
        id="out"
        style={HandleStyleOverride}
      />
    </EntityNodeContainer>
  );
});

EntityNode.displayName = 'EntityNode';
