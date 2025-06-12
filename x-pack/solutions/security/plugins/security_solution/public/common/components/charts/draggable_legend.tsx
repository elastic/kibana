/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { rgba } from 'polished';
import React from 'react';
import { css } from '@emotion/react';

import type { LegendItem } from './draggable_legend_item';
import { DraggableLegendItem } from './draggable_legend_item';

export const MIN_LEGEND_HEIGHT = 175;
export const DEFAULT_WIDTH = 165; // px

const useStyles = (height: number, minWidth: number) => {
  const { euiTheme } = useEuiTheme();

  return {
    draggableLegendContainer: css`
      height: ${height}px;
      overflow: auto;
      scrollbar-width: thin;
      width: 100%;

      @media only screen and (min-width: ${euiTheme.breakpoint.m}) {
        width: 165px;
      }

      min-width: ${minWidth}px;

      &::-webkit-scrollbar {
        height: ${euiTheme.size.base};
        width: ${euiTheme.size.base};
      }

      &::-webkit-scrollbar-thumb {
        background-clip: content-box;
        background-color: ${rgba(euiTheme.colors.darkShade, 0.5)};
        border: ${euiTheme.border.radius.small} solid transparent;
      }

      &::-webkit-scrollbar-corner,
      &::-webkit-scrollbar-track {
        background-color: transparent;
      }
    `,
  };
};

const DraggableLegendComponent: React.FC<{
  className?: string;
  height: number | undefined;
  legendItems: LegendItem[];
  minWidth?: number;
  isInlineActions?: boolean;
}> = ({
  className,
  height = 0,
  legendItems,
  minWidth = DEFAULT_WIDTH,
  isInlineActions = false,
}) => {
  const styles = useStyles(height === 0 ? MIN_LEGEND_HEIGHT : height, minWidth);

  if (legendItems.length === 0) {
    return null;
  }

  return (
    <div
      css={styles.draggableLegendContainer}
      className={className}
      data-test-subj="draggable-legend"
    >
      <EuiText size="xs">
        <EuiFlexGroup direction="column" gutterSize="none">
          {legendItems.map((item) => (
            <EuiFlexItem key={item.dataProviderId} grow={false}>
              <DraggableLegendItem legendItem={item} isInlineActions={isInlineActions} />
              <EuiSpacer data-test-subj="draggable-legend-spacer" size="s" />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiText>
    </div>
  );
};

DraggableLegendComponent.displayName = 'DraggableLegendComponent';

export const DraggableLegend = React.memo(DraggableLegendComponent);
