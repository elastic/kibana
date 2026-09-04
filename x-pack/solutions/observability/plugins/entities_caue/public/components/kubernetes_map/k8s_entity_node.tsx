/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import { K8S_TYPE_LABELS } from '../../../common/k8s_type_labels';
import type { K8sEntityNodeData } from './build_topology';

// EUI-palette-aligned accent colours per entity type.
const TYPE_ACCENT: Record<string, string> = {
  'k8s.namespace': '#00BFB3', // euiColorVis0 teal
  'k8s.deployment': '#1BA9F5', // euiColorVis1 blue
  'k8s.daemonset': '#9B59B6', // euiColorVis6 purple
  'k8s.replicaset': '#54B399', // euiColorVis2 green
  'k8s.pod': '#F5A700', // euiColorVis5 amber
  'k8s.container': '#E76797', // euiColorVis9 pink
};

type K8sEntityNodeType = NodeProps & { data: K8sEntityNodeData };

/** Rectangular node card rendered inside the k8s topology React Flow canvas.
 *  One component handles all k8s entity types; the accent colour varies by type. */
export const K8sEntityNode = ({ data }: K8sEntityNodeType) => {
  const { euiTheme } = useEuiTheme();
  const accent = TYPE_ACCENT[data.entityType] ?? euiTheme.colors.text;
  const typeLabel = K8S_TYPE_LABELS[data.entityType] ?? data.entityType;

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <div
        style={{
          border: `2px solid ${accent}`,
          borderRadius: euiTheme.border.radius.medium,
          background: euiTheme.colors.emptyShade,
          padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
          width: 180,
          boxSizing: 'border-box',
          fontFamily: euiTheme.font.family,
          cursor: 'default',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: euiTheme.font.weight.semiBold,
            color: accent,
            marginBottom: 2,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {typeLabel}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: euiTheme.font.weight.medium,
            color: euiTheme.colors.title,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.label}
        </div>
        {data.nodeName && (
          <div
            style={{
              fontSize: 10,
              color: euiTheme.colors.subduedText,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            ⬢ {data.nodeName}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </>
  );
};
