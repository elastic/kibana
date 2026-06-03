/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiTablePagination,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useAnomalyBands } from '../../recent_anomalies/anomaly_bands';
import { BehavioralAnomaliesV2Swimlane } from '../behavioral_anomalies_swimlane';
import { SeverityLegendControlV2 } from './severity_legend_control';
import type { SeverityOptionV2 } from '../hooks/use_severity_options';
import { useSeverityOptionsV2 } from '../hooks/use_severity_options';
import {
  DEFAULT_PAGE_SIZE_V2,
  getJobDisplayNameV2,
  getTimelineHeatmapRecordsV2,
  getTimelineRowKeysV2,
  PAGE_SIZE_OPTIONS_V2,
} from '../mock_tab_data';
import type { ViewByFieldV2 } from '../types';
import { ANOMALY_TIMELINE_V2_TITLE } from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V2_TIMELINE_SECTION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_TIMELINE_SWIMLANE_TEST_ID,
} from '../test_ids';
import { TimelineRowLabelsV2 } from './timeline_row_labels';

/** Swim lane rows are always grouped by ML job in v.2 (no "View by" control). */
const FIXED_VIEW_BY: ViewByFieldV2 = 'job_id';

interface AnomalyTimelineSectionV2Props {
  /**
   * Selected timeline window (millis). Owned by the parent tab so the time
   * picker can live at the top of the tab content rather than inside this
   * section.
   */
  timeRangeMs: { from: number; to: number };
}

export const AnomalyTimelineSectionV2: React.FC<AnomalyTimelineSectionV2Props> = ({
  timeRangeMs,
}) => {
  const { bands } = useAnomalyBands();
  const severityOptions = useSeverityOptionsV2();
  const [selectedSeverities, setSelectedSeverities] =
    useState<SeverityOptionV2[]>(severityOptions);
  const handleSeverityChange = useCallback((next: SeverityOptionV2[]) => {
    setSelectedSeverities(next);
  }, []);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE_V2);

  const allRowKeys = useMemo(() => getTimelineRowKeysV2(FIXED_VIEW_BY), []);
  const pagedRowKeys = useMemo(() => {
    const startIdx = pageIndex * pageSize;
    return allRowKeys.slice(startIdx, startIdx + pageSize);
  }, [allRowKeys, pageIndex, pageSize]);

  const rowLabels = useMemo(
    () => pagedRowKeys.map((rowKey) => ({ id: rowKey, label: getJobDisplayNameV2(rowKey) })),
    [pagedRowKeys]
  );

  const heatmapRecords = useMemo(
    () => getTimelineHeatmapRecordsV2(pagedRowKeys, FIXED_VIEW_BY, timeRangeMs),
    [pagedRowKeys, timeRangeMs]
  );

  return (
    <div data-test-subj={BEHAVIORAL_ANOMALIES_V2_TIMELINE_SECTION_TEST_ID}>
      <EuiTitle size="xs">
        <h3>{ANOMALY_TIMELINE_V2_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false} css={css({ minWidth: 280 })}>
          <SeverityLegendControlV2
            allSeverityOptions={severityOptions}
            selectedSeverities={selectedSeverities}
            onChange={handleSeverityChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup data-test-subj={BEHAVIORAL_ANOMALIES_V2_TIMELINE_SWIMLANE_TEST_ID}>
        <TimelineRowLabelsV2 rows={rowLabels} compressed />
        <BehavioralAnomaliesV2Swimlane
          records={heatmapRecords}
          anomalyBands={bands}
          entityNames={pagedRowKeys}
          entityAccessor={FIXED_VIEW_BY}
          heatmapId="entity-flyout-behavioral-anomalies-v2-detail-heatmap"
          timeRangeMs={timeRangeMs}
        />
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiTablePagination
        pageCount={Math.max(1, Math.ceil(allRowKeys.length / pageSize))}
        activePage={pageIndex}
        itemsPerPage={pageSize}
        itemsPerPageOptions={PAGE_SIZE_OPTIONS_V2}
        onChangePage={(page) => setPageIndex(page)}
        onChangeItemsPerPage={(size) => {
          setPageSize(size);
          setPageIndex(0);
        }}
      />
    </div>
  );
};
