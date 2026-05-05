/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { EuiIcon, EuiText, EuiFlexGroup, EuiFlexItem, EuiBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DestinationNodeData, NodeHealth } from '../../mock_data';

const HEALTH_COLORS: Record<NodeHealth, string> = {
  healthy: '#00bfb3',
  good: '#6dccb1',
  degraded: '#f5a700',
  poor: '#bd271e',
};

const HEALTH_LABELS: Record<NodeHealth, string> = {
  healthy: 'Healthy',
  good: 'Good',
  degraded: 'Degraded',
  poor: 'Poor',
};

type DestinationNodeType = Node<DestinationNodeData, 'destination'>;

export const DestinationNode = ({ data, selected }: NodeProps<DestinationNodeType>) => {
  const { euiTheme } = useEuiTheme();
  const health = data.health as NodeHealth;
  const healthColor = HEALTH_COLORS[health];

  const containerStyles = css`
    background: ${euiTheme.colors.backgroundBasePlain};
    border: 1.5px solid ${selected ? euiTheme.colors.primary : euiTheme.colors.borderBasePlain};
    border-radius: ${euiTheme.border.radius.medium};
    padding: 8px 10px;
    width: 200px;
    box-shadow: ${selected ? `0 0 0 2px ${euiTheme.colors.primary}33` : '0 1px 3px rgba(0,0,0,0.12)'};
    cursor: pointer;
  `;

  const metaStyles = css`
    color: ${euiTheme.colors.subduedText};
    margin-top: 2px;
  `;

  const healthDotStyles = css`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${healthColor};
    flex-shrink: 0;
  `;

  return (
    <div css={containerStyles}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />

      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={data.destinationType === 's3' ? 'logoAWS' : 'indexOpen'}
            size="m"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <strong>{data.label}</strong>
              </EuiText>
            </EuiFlexItem>
            {data.subStreams !== undefined && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" style={{ fontSize: 10 }}>
                  {data.subStreams} sub-streams
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        css={css`
          margin-top: 4px;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="xs" css={metaStyles}>
            {data.eps}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div css={healthDotStyles} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            css={css`
              color: ${healthColor};
              font-weight: 500;
            `}
          >
            {HEALTH_LABELS[health]}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
