/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { transparentize, useEuiTheme } from '@elastic/eui';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
  type EdgeTypes,
} from '@xyflow/react';
import { getAlertSeverityColor } from './common';
import type { AttackPathEdgeKind } from './attack_path_layout';
import type { AlertSeverity } from './hooks/use_entity_relationships';

export const ATTACK_PATH_EDGE_TYPE = 'attackPathEdge';

export interface AttackPathEdgeData extends Record<string, unknown> {
  kind: AttackPathEdgeKind;
  label: string | undefined;
  severity: AlertSeverity | undefined;
  /** Dimmed when a focus selection excludes this edge. */
  dimmed: boolean;
}

/** Displays non-directional observed associations; visual flow does not imply attack progression. */
const AttackPathEdgeInner: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}) => {
  const { euiTheme } = useEuiTheme();
  const edgeData = data as AttackPathEdgeData | undefined;
  const isBranch = edgeData?.kind === 'branch';
  const color = isBranch
    ? euiTheme.colors.borderBaseProminent
    : transparentize(getAlertSeverityColor(euiTheme, edgeData?.severity), 0.65);
  const opacity = edgeData?.dimmed ? 0.2 : 1;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 14,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: isBranch ? 1.5 : 2.5,
          strokeDasharray: isBranch ? '4 5' : undefined,
          opacity,
        }}
      />
      {edgeData?.label ? (
        <EdgeLabelRenderer>
          <div
            css={css`
              position: absolute;
              transform: translate(-50%, -50%) translate(${labelX}px, ${labelY}px);
              pointer-events: none;
              max-width: 150px;
              padding: 2px ${euiTheme.size.xs};
              border-radius: ${euiTheme.border.radius.small};
              background: ${euiTheme.colors.backgroundBasePlain};
              border: ${euiTheme.border.thin};
              box-shadow: ${euiTheme.shadows.xs};
              font-size: ${euiTheme.size.m};
              color: ${euiTheme.colors.textSubdued};
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              opacity: ${opacity};
            `}
            title={edgeData.label}
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
};

export const AttackPathEdge = memo(AttackPathEdgeInner);

export const attackPathEdgeTypes: EdgeTypes = {
  [ATTACK_PATH_EDGE_TYPE]: AttackPathEdge,
};
