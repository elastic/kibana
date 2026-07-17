/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { Handle, Position, useViewport, type NodeProps } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import type { KiNodeData } from './types';

const NODE_SIZE = 20;

function KiNodeComponent({ data, selected }: NodeProps<KiNodeData>) {
  const { euiTheme } = useEuiTheme();
  const { zoom } = useViewport();
  const { feature, color, borderColor, isPhantom, dimmed } = data;
  const isSelected = selected || data.selected;
  const [hovered, setHovered] = useState(false);

  const size = NODE_SIZE;
  const isHub = !isPhantom && feature.confidence >= 90;
  const nodeOpacity = dimmed ? 0.15 : isPhantom ? 0.5 : 1;

  const showLabel = zoom > 0.35;
  const showTooltip = hovered && zoom > 0.25;

  return (
    <div
      style={{ position: 'relative', width: size, height: size }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, width: 1, height: 1, top: '50%', left: '50%' }}
      />

      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `${isSelected ? 3 : 2}px ${isPhantom ? 'dashed' : 'solid'} ${isSelected ? euiTheme.colors.primary : borderColor}`,
          backgroundColor: isPhantom ? 'transparent' : color,
          opacity: nodeOpacity,
          boxShadow: isSelected
            ? `0 0 0 3px ${euiTheme.colors.primary}40, 0 2px 8px rgba(0,0,0,0.4)`
            : isHub
            ? `0 0 8px ${borderColor}60`
            : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.25s ease',
          transform: hovered ? 'scale(1.2)' : 'scale(1)',
        }}
      >
        {zoom > 0.6 && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: euiTheme.colors.ghost,
              textTransform: 'uppercase',
              userSelect: 'none',
            }}
          >
            {feature.title.charAt(0)}
          </span>
        )}
      </div>

      {/* Label below node — hidden when zoomed out */}
      {showLabel && (
        <div
          style={{
            position: 'absolute',
            top: size + 4,
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            fontSize: 9,
            fontWeight: 500,
            color: hovered || isSelected ? euiTheme.colors.text : euiTheme.colors.subduedText,
            textAlign: 'center',
            maxWidth: 80,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            transition: 'color 0.15s ease, opacity 0.25s ease',
            opacity: dimmed ? 0.15 : 1,
          }}
        >
          {feature.title.length > 12 ? feature.title.slice(0, 11) + '…' : feature.title}
        </div>
      )}

      {/* Hover tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: size + 8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: euiTheme.colors.emptyShade,
            border: `1px solid ${euiTheme.colors.lightShade}`,
            borderRadius: 6,
            padding: '6px 10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: euiTheme.colors.text }}>
            {feature.title}
          </div>
          <div style={{ fontSize: 10, color: euiTheme.colors.subduedText, marginTop: 2 }}>
            {isPhantom ? 'external service' : `${feature.type} · ${feature.confidence}%`}
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, width: 1, height: 1, top: '50%', left: '50%' }}
      />
    </div>
  );
}

export const KiNode = memo(KiNodeComponent);
