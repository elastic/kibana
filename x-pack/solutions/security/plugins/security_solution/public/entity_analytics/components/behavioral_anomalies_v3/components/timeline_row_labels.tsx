/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { getAnomalyChartStyling } from '../../recent_anomalies/anomaly_chart_styling';

interface TimelineRowLabelV3 {
  id: string;
  label: string;
}

interface TimelineRowLabelsV3Props {
  rows: TimelineRowLabelV3[];
  compressed?: boolean;
}

export const TimelineRowLabelsV3: React.FC<TimelineRowLabelsV3Props> = ({
  rows,
  compressed = false,
}) => {
  const styling = getAnomalyChartStyling(compressed);

  return (
    <EuiFlexItem
      css={css`
        height: ${styling.heightOfEntityNamesList(rows.length)}px;
      `}
      grow={false}
    >
      <EuiFlexGroup gutterSize="none" direction="column" justifyContent="center">
        {rows.map((row) => (
          <EuiFlexItem
            key={row.id}
            css={css`
              justify-content: center;
              height: ${styling.heightOfEachCell}px;
            `}
            grow={false}
          >
            <EuiToolTip content={row.label}>
              <EuiText
                textAlign="right"
                size="xs"
                css={css`
                  max-width: 140px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                `}
              >
                {row.label}
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
