/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
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
          // Per BA-v.3 design: no tooltip on the tactic name. The label
          // still truncates with an ellipsis inside the 140px column so a
          // very long tactic name stays inline.
          <EuiFlexItem
            key={row.id}
            css={css`
              justify-content: center;
              height: ${styling.heightOfEachCell}px;
            `}
            grow={false}
          >
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
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
