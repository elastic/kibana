/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { TransformNodeData } from '../../mock_data';

type TransformNodeType = Node<TransformNodeData, 'transform'>;

export const TransformNode = ({ selected }: NodeProps<TransformNodeType>) => {
  const { euiTheme } = useEuiTheme();

  const containerStyles = css`
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: ${euiTheme.colors.backgroundBasePlain};
    border: 1.5px solid ${selected ? euiTheme.colors.primary : euiTheme.colors.borderBasePlain};
    box-shadow: ${selected ? `0 0 0 2px ${euiTheme.colors.primary}33` : '0 1px 3px rgba(0,0,0,0.12)'};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  `;

  return (
    <div css={containerStyles}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <EuiIcon type="gear" size="m" color={euiTheme.colors.subduedText} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
};
