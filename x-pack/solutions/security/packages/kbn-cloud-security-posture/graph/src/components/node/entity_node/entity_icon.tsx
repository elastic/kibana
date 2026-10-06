/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiNotificationBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { NodeColor } from '@kbn/cloud-security-posture-common/types/graph/latest';
import { getSpanIcon } from '../get_span_icon';
import { showStackedShape } from '../../utils';
import { GRAPH_ENTITY_NODE_ICON_ID } from '../../test_ids';

export interface EntityIconProps {
  icon?: string;
  color?: NodeColor;
  count?: number;
}

const ICON_TILE_SIZE = 40;

export const EntityIcon = ({ icon, color = 'primary', count }: EntityIconProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        position: relative;
        width: ${ICON_TILE_SIZE}px;
        height: ${ICON_TILE_SIZE}px;
      `}
    >
      <div
        data-test-subj={GRAPH_ENTITY_NODE_ICON_ID}
        css={css`
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
        `}
      >
        {icon ? (
          <EuiIcon type={getSpanIcon(icon) ?? icon} size="l" color={color} aria-hidden={true} />
        ) : null}
      </div>
      {showStackedShape(count) ? (
        <EuiNotificationBadge
          color="accent"
          css={css`
            position: absolute;
            top: -${euiTheme.size.xs};
            left: -${euiTheme.size.xs};
          `}
        >
          {count}
        </EuiNotificationBadge>
      ) : null}
    </div>
  );
};

EntityIcon.displayName = 'EntityIcon';
