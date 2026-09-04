/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useEuiTheme, EuiToolTip } from '@elastic/eui';
import { getHealthColors, getHealthColor, getHealthTooltip } from '../../utils/health_colors';

/** Data payload for a service node — set via the `data` field in the xyflow node object. */
export interface ServiceNodeData extends Record<string, unknown> {
  label: string;
  level: string | null;
  scoreNorm: number | null;
}

type ServiceNodeType = Node<ServiceNodeData, 'service'>;

/** Size constant shared with service_map.tsx for dagre layout spacing. */
export const SERVICE_NODE_SIZE = 140;

/** Custom xyflow node component for service entities.
 *  Renders a circular node with a health-level colour ring and a hover tooltip. */
export const ServiceNode = ({
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<ServiceNodeType>) => {
  const { euiTheme } = useEuiTheme();

  const { borderColor, tooltip } = useMemo(() => {
    const colors = getHealthColors(euiTheme);
    return {
      borderColor: getHealthColor(data.level, colors),
      tooltip: getHealthTooltip(data.level, data.scoreNorm),
    };
  }, [data.level, data.scoreNorm, euiTheme]);

  const circleStyle: React.CSSProperties = {
    width: SERVICE_NODE_SIZE,
    height: SERVICE_NODE_SIZE,
    borderRadius: '50%',
    border: `3px solid ${borderColor}`,
    backgroundColor: euiTheme.colors.emptyShade,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '12px',
    boxSizing: 'border-box',
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: 1.3,
    color: euiTheme.colors.title,
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    boxShadow: `0 2px 8px ${euiTheme.colors.shadow ?? 'rgba(0,0,0,0.12)'}`,
    cursor: 'default',
  };

  const handleStyle: React.CSSProperties = { visibility: 'hidden' };

  const ariaLabel = data.level ? `${data.label} — ${data.level}` : data.label;

  return (
    <>
      <Handle type="target" position={targetPosition ?? Position.Left} style={handleStyle} />
      <EuiToolTip content={tooltip} position="top">
        {/* tabIndex={0} required by EUI's tooltip-focusable-anchor rule */}
        <div style={circleStyle} aria-label={ariaLabel} tabIndex={0}>
          {data.label}
        </div>
      </EuiToolTip>
      <Handle type="source" position={sourcePosition ?? Position.Right} style={handleStyle} />
    </>
  );
};
