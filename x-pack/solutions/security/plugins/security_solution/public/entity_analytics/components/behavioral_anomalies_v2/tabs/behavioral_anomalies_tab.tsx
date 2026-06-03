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
  EuiSpacer,
  EuiSuperDatePicker,
  type OnTimeChangeProps,
} from '@elastic/eui';
import dateMath from '@kbn/datemath';
import { ML_PAGES, useMlManagementHref } from '@kbn/ml-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import { AnomaliesTableSectionV2 } from '../components/anomalies_table_section';
import { AnomalyTimelineSectionV2 } from '../components/anomaly_timeline_section';
import { DEFAULT_TIMELINE_RANGE_V2 } from '../mock_tab_data';
import { ANOMALY_TIMELINE_V2_MANAGE_ML_JOBS } from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V2_DATE_PICKER_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_MANAGE_ML_JOBS_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_TAB_CONTENT_TEST_ID,
} from '../test_ids';

const resolveTimeMillis = (value: string, roundUp: boolean): number => {
  const parsed = dateMath.parse(value, { roundUp })?.valueOf();
  if (typeof parsed === 'number' && Number.isFinite(parsed)) {
    return parsed;
  }
  const native = new Date(value).getTime();
  return Number.isFinite(native) ? native : Date.now();
};

export const BehavioralAnomaliesV2Tab: React.FC = () => {
  // EuiSuperDatePicker selection — kept as the raw string values it emits so
  // relative ranges ("now-1y") survive future user edits intact. Resolved to
  // absolute millis below for the swim lane.
  const [start, setStart] = useState<string>(DEFAULT_TIMELINE_RANGE_V2.from);
  const [end, setEnd] = useState<string>(DEFAULT_TIMELINE_RANGE_V2.to);
  const handleTimeChange = useCallback(({ start: s, end: e }: OnTimeChangeProps) => {
    setStart(s);
    setEnd(e);
  }, []);

  const timeRangeMs = useMemo(
    () => ({
      from: resolveTimeMillis(start, false),
      to: resolveTimeMillis(end, true),
    }),
    [start, end]
  );

  const {
    services: { ml },
  } = useKibana();
  const manageJobsHref = useMlManagementHref(ml, {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
  });

  return (
    <div data-test-subj={BEHAVIORAL_ANOMALIES_V2_TAB_CONTENT_TEST_ID}>
      {/* Top tab bar: time picker on the left, "Manage ML jobs" on the right. */}
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        gutterSize="s"
      >
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            start={start}
            end={end}
            onTimeChange={handleTimeChange}
            showUpdateButton={false}
            compressed
            width="auto"
            data-test-subj={BEHAVIORAL_ANOMALIES_V2_DATE_PICKER_TEST_ID}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj={BEHAVIORAL_ANOMALIES_V2_MANAGE_ML_JOBS_TEST_ID}
            color="primary"
            size="s"
            iconType="external"
            iconSide="right"
            href={manageJobsHref}
            target="_blank"
            isDisabled={!manageJobsHref}
          >
            {ANOMALY_TIMELINE_V2_MANAGE_ML_JOBS}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <AnomalyTimelineSectionV2 timeRangeMs={timeRangeMs} />
      <EuiSpacer size="l" />
      <AnomaliesTableSectionV2 />
    </div>
  );
};
