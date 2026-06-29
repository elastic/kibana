/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
  EuiTablePagination,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ML_PAGES, useMlManagementHref } from '@kbn/ml-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import { useAnomalyBands } from '../../recent_anomalies/anomaly_bands';
import { BehavioralAnomaliesSwimlane } from '../behavioral_anomalies_swimlane';
import { SeverityLegendControl } from './severity_legend_control';
import type { SeverityOption } from '../hooks/use_severity_options';
import { useSeverityOptions } from '../hooks/use_severity_options';
import {
  DEFAULT_PAGE_SIZE,
  getJobDisplayName,
  getTimelineHeatmapRecords,
  getTimelineRowKeys,
  PAGE_SIZE_OPTIONS,
  VIEW_BY_FIELD_OPTIONS,
} from '../mock_tab_data';
import type { ViewByField } from '../types';
import { ANOMALY_TIMELINE_MANAGE_ML_JOBS, ANOMALY_TIMELINE_TITLE } from '../translations';
import {
  BEHAVIORAL_ANOMALIES_TIMELINE_MANAGE_ML_JOBS_TEST_ID,
  BEHAVIORAL_ANOMALIES_TIMELINE_SECTION_TEST_ID,
  BEHAVIORAL_ANOMALIES_TIMELINE_SWIMLANE_TEST_ID,
} from '../test_ids';
import { TimelineRowLabels } from './timeline_row_labels';

export const AnomalyTimelineSection: React.FC = () => {
  const [viewBy, setViewBy] = useState<ViewByField>('job_id');
  const { bands } = useAnomalyBands();
  const severityOptions = useSeverityOptions();
  const [selectedSeverities, setSelectedSeverities] =
    useState<SeverityOption[]>(severityOptions);
  const handleSeverityChange = useCallback((next: SeverityOption[]) => {
    setSelectedSeverities(next);
  }, []);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const {
    services: { ml },
  } = useKibana();
  const manageJobsHref = useMlManagementHref(ml, {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
  });

  const allRowKeys = useMemo(() => getTimelineRowKeys(viewBy), [viewBy]);
  const pagedRowKeys = useMemo(() => {
    const start = pageIndex * pageSize;
    return allRowKeys.slice(start, start + pageSize);
  }, [allRowKeys, pageIndex, pageSize]);

  const rowLabels = useMemo(
    () =>
      pagedRowKeys.map((rowKey) => ({
        id: rowKey,
        label: viewBy === 'job_id' ? getJobDisplayName(rowKey) : rowKey,
      })),
    [pagedRowKeys, viewBy]
  );

  const heatmapRecords = useMemo(
    () => getTimelineHeatmapRecords(pagedRowKeys, viewBy),
    [pagedRowKeys, viewBy]
  );

  return (
    <div data-test-subj={BEHAVIORAL_ANOMALIES_TIMELINE_SECTION_TEST_ID}>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        gutterSize="s"
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{ANOMALY_TIMELINE_TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj={BEHAVIORAL_ANOMALIES_TIMELINE_MANAGE_ML_JOBS_TEST_ID}
            color="primary"
            size="s"
            iconType="external"
            iconSide="right"
            href={manageJobsHref}
            target="_blank"
            isDisabled={!manageJobsHref}
          >
            {ANOMALY_TIMELINE_MANAGE_ML_JOBS}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        responsive={false}
        wrap
        css={css`
          & > .euiFlexItem {
            flex-shrink: 0;
          }
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiSelect
            prepend="View by"
            aria-label="View by"
            options={VIEW_BY_FIELD_OPTIONS}
            value={viewBy}
            onChange={(e) => {
              setViewBy(e.target.value as ViewByField);
              setPageIndex(0);
            }}
            compressed
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={css({ minWidth: 280 })}>
          <SeverityLegendControl
            allSeverityOptions={severityOptions}
            selectedSeverities={selectedSeverities}
            onChange={handleSeverityChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup data-test-subj={BEHAVIORAL_ANOMALIES_TIMELINE_SWIMLANE_TEST_ID}>
        <TimelineRowLabels rows={rowLabels} compressed />
        <BehavioralAnomaliesSwimlane
          records={heatmapRecords}
          anomalyBands={bands}
          entityNames={pagedRowKeys}
          entityAccessor={viewBy}
          heatmapId="entity-flyout-behavioral-anomalies-detail-heatmap"
        />
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiTablePagination
        pageCount={Math.max(1, Math.ceil(allRowKeys.length / pageSize))}
        activePage={pageIndex}
        itemsPerPage={pageSize}
        itemsPerPageOptions={PAGE_SIZE_OPTIONS}
        onChangePage={(page) => setPageIndex(page)}
        onChangeItemsPerPage={(size) => {
          setPageSize(size);
          setPageIndex(0);
        }}
      />
    </div>
  );
};
