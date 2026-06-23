/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useAnomalyV3SingleMetricViewerUrl } from '../hooks/use_anomaly_single_metric_viewer_url';
import type { BehavioralAnomalyV3TableRow } from '../types';
import { BEHAVIORAL_ANOMALIES_V3_TABLE_JOB_NAME_LINK_TEST_ID } from '../test_ids';
import { TruncatedTextCellV3 } from './truncated_text_cell';

interface AnomalyJobNameCellV3Props {
  row: BehavioralAnomalyV3TableRow;
}

/**
 * BA-v.3: renders the ML job name as a link that opens the row's anomaly in
 * the ML Single Metric Viewer in a new tab. Falls back to a plain label when
 * the ML plugin is unavailable.
 *
 * Truncation + overflow-only tooltip are handled by `TruncatedTextCellV3` —
 * the full job name is shown on hover ONLY when the visible label was
 * trimmed with an ellipsis. Tooltip content is the unstyled string so it
 * stays legible regardless of the link state.
 */
export const AnomalyJobNameCellV3: React.FC<AnomalyJobNameCellV3Props> = ({ row }) => {
  const singleMetricViewerUrl = useAnomalyV3SingleMetricViewerUrl(row);

  if (!singleMetricViewerUrl) {
    return (
      <TruncatedTextCellV3 tooltipContent={row.jobDisplayName}>
        {row.jobDisplayName}
      </TruncatedTextCellV3>
    );
  }

  return (
    <TruncatedTextCellV3 tooltipContent={row.jobDisplayName}>
      <EuiLink
        color="primary"
        href={singleMetricViewerUrl}
        target="_blank"
        external={false}
        data-test-subj={BEHAVIORAL_ANOMALIES_V3_TABLE_JOB_NAME_LINK_TEST_ID}
      >
        {row.jobDisplayName}
      </EuiLink>
    </TruncatedTextCellV3>
  );
};
