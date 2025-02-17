/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

interface DonutChartEmptyProps {
  size?: number;
  donutWidth?: number;
}

/*
 ** @deprecated
 */
export const emptyDonutColor = '#FAFBFD';

const EmptyDonutChartComponent: React.FC<DonutChartEmptyProps> = ({
  size = 90,
  donutWidth = 20,
}) => {
  const { euiTheme } = useEuiTheme();
  const middleSize = size - donutWidth;
  return size - donutWidth > 0 ? (
    <div
      data-test-subj="empty-donut"
      css={css`
        border-radius: 50%;
        height: ${size}px;
        width: ${size}px;
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
        text-align: center;
        line-height: ${size}px;
      `}
    >
      <div
        data-test-subj="empty-donut-small"
        css={css`
          border-radius: 50%;
          height: ${middleSize}px;
          width: ${middleSize}px;
          background-color: ${euiTheme.colors.backgroundBasePlain};
          display: inline-block;
          vertical-align: middle;
        `}
      />
    </div>
  ) : null;
};

export const DonutChartEmpty = React.memo(EmptyDonutChartComponent);
