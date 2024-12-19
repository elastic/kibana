/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

const DEFAULT_WIDTH = 12; // px

interface Props {
  width?: number;
}

const AxisTickComponent: React.FC<Props> = ({ width = DEFAULT_WIDTH }) => {
  const { euiTheme } = useEuiTheme();

  const TOP_CELL_HEIGHT = 3; // px
  const BOTTOM_CELL_HEIGHT = 2; // px

  return (
    <EuiFlexGroup data-test-subj="axisTick" direction="column" gutterSize="none">
      <EuiFlexItem
        css={css`
          border-bottom: 1px solid ${euiTheme.colors.lightShade};
          border-right: 1px solid ${euiTheme.colors.lightShade};
          height: ${TOP_CELL_HEIGHT}px;
          width: ${width}px;
        `}
        data-test-subj="topCell"
        grow={false}
      />
      <EuiFlexItem
        css={css`
          border-right: 1px solid ${euiTheme.colors.lightShade};
          height: ${BOTTOM_CELL_HEIGHT}px;
          width: ${width}px;
        `}
        data-test-subj="bottomCell"
        grow={false}
      />
    </EuiFlexGroup>
  );
};

AxisTickComponent.displayName = 'AxisTick';

export const AxisTick = React.memo(AxisTickComponent);
