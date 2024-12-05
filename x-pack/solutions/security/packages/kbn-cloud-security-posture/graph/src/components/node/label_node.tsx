/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { LabelNodeContainer, LabelShape, HandleStyleOverride, LabelShapeOnHover } from './styles';
import type { LabelNodeViewModel, NodeProps } from '../types';

export const LabelNode: React.FC<NodeProps> = memo((props: NodeProps) => {
  const { id, color, label, interactive } = props.data as LabelNodeViewModel;

  return (
    <LabelNodeContainer>
      {interactive && <LabelShapeOnHover color={color} />}
      <LabelShape color={color} textAlign="center">
        {Boolean(label) ? label : id}
      </LabelShape>
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
    </LabelNodeContainer>
  );
});
