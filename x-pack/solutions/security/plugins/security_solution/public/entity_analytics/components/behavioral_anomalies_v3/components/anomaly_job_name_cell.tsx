/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { useAnomalyV3SingleMetricViewerUrl } from '../hooks/use_anomaly_single_metric_viewer_url';
import type { BehavioralAnomalyV3TableRow } from '../types';
import { BEHAVIORAL_ANOMALIES_V3_TABLE_JOB_NAME_LINK_TEST_ID } from '../test_ids';

// See note in `anomalies_table_section.tsx` — truncation rules must sit on the
// EuiToolTip anchor (the element directly wrapping the text) so the browser
// can render the ellipsis. `min-width: 0` allows the anchor to shrink below
// its intrinsic content width inside the cell's flex container.
const truncatedAnchorCss = css`
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

interface AnomalyJobNameCellV3Props {
  row: BehavioralAnomalyV3TableRow;
}

/**
 * BA-v.2: renders the ML job name as a link that opens the row's anomaly in
 * the ML Single Metric Viewer in a new tab. Falls back to a plain label when
 * the ML plugin is unavailable.
 */
export const AnomalyJobNameCellV3: React.FC<AnomalyJobNameCellV3Props> = ({ row }) => {
  const singleMetricViewerUrl = useAnomalyV3SingleMetricViewerUrl(row);

  if (!singleMetricViewerUrl) {
    return (
      <EuiToolTip content={row.jobDisplayName} anchorProps={{ css: truncatedAnchorCss }}>
        <EuiText size="xs" component="span">
          {row.jobDisplayName}
        </EuiText>
      </EuiToolTip>
    );
  }

  return (
    <EuiToolTip content={row.jobDisplayName} anchorProps={{ css: truncatedAnchorCss }}>
      <EuiText size="xs" component="span">
        <EuiLink
          color="primary"
          href={singleMetricViewerUrl}
          target="_blank"
          external={false}
          data-test-subj={BEHAVIORAL_ANOMALIES_V3_TABLE_JOB_NAME_LINK_TEST_ID}
        >
          {row.jobDisplayName}
        </EuiLink>
      </EuiText>
    </EuiToolTip>
  );
};
