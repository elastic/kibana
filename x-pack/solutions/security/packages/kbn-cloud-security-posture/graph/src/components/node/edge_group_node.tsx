/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { HandleStyleOverride } from './styles';
import type { NodeProps } from '../types';

export const EdgeGroupNode = memo<NodeProps>((props: NodeProps) => {
  // Handles order horizontally is: in > inside > out > outside
  return (
    <>
      <Handle
        type="target"
        isConnectable={false}
        position={Position.Right}
        id="out"
        style={HandleStyleOverride}
      />
      <Handle
        type="source"
        isConnectable={false}
        position={Position.Right}
        id="outside"
        style={HandleStyleOverride}
      />
      <Handle
        type="source"
        isConnectable={false}
        position={Position.Left}
        id="inside"
        style={HandleStyleOverride}
      />
      <Handle
        type="target"
        isConnectable={false}
        position={Position.Left}
        id="in"
        style={HandleStyleOverride}
      />
    </>
  );
});

EdgeGroupNode.displayName = 'EdgeGroupNode';
