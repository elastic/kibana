/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSuperDatePicker,
  type OnTimeChangeProps,
} from '@elastic/eui';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { ML_PAGES, useMlManagementHref } from '@kbn/ml-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import { AnomaliesTableSectionV2 } from '../components/anomalies_table_section';
import { AnomalyTimelineSectionV2 } from '../components/anomaly_timeline_section';
import { AttackChainSectionV2 } from '../components/attack_chain_section';
import {
  DEFAULT_TIMELINE_RANGE_V2,
  getTriggeredTacticsForRangeV2,
} from '../mock_tab_data';
import {
  ANOMALY_TIMELINE_V2_MANAGE_ML_JOBS,
  TACTIC_FILTER_V2_CLEAR_LABEL,
} from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V2_DATE_PICKER_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_MANAGE_ML_JOBS_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_TAB_CONTENT_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_TACTIC_FILTER_PILL_TEST_ID,
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

  // Re-derive triggered tactics whenever the picker selection changes so the
  // Attack chain visualization reflects the current window.
  const triggeredTactics = useMemo(
    () => getTriggeredTacticsForRangeV2(timeRangeMs),
    [timeRangeMs]
  );

  // Tab-level tactic filter — drives:
  //  - Attack chain dot selected-state styling
  //  - Anomaly timeline swim lane row collapse (15 → 1)
  //  - Anomalies table row filter
  // Toggled by clicking a triggered dot (per the design Q&A: click-again to
  // clear). Also cleared via the pill rendered below the chain.
  const [selectedTactic, setSelectedTactic] = useState<string | null>(null);

  const handleSelectTactic = useCallback((tactic: string) => {
    setSelectedTactic((current) => (current === tactic ? null : tactic));
  }, []);

  const handleClearTactic = useCallback(() => {
    setSelectedTactic(null);
  }, []);

  // If the user changes the time range so the currently-selected tactic is
  // no longer triggered, drop the filter — the chain dot would otherwise
  // sit in its triggered+selected styling against a row of gray dots.
  useEffect(() => {
    if (selectedTactic && !triggeredTactics.includes(selectedTactic)) {
      setSelectedTactic(null);
    }
  }, [selectedTactic, triggeredTactics]);

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
      {/* New "Attack chain" section sits above the timeline per design v.2.
          Cleanup: delete this block + `AttackChainSectionV2` import + the
          `triggeredTactics` memo above if the chain is removed. */}
      <AttackChainSectionV2
        triggeredTactics={triggeredTactics}
        selectedTactic={selectedTactic}
        onSelectTactic={handleSelectTactic}
      />
      <EuiSpacer size="l" />
      {/* "Filtered by: <Tactic>" pill — only rendered while a tactic filter
          is active. The pill's × icon clears the filter; clicking the same
          dot in the chain above also clears it. Cleanup: delete this block
          + the `selectedTactic` state if the chain is removed. */}
      {selectedTactic && (
        <>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge
                data-test-subj={BEHAVIORAL_ANOMALIES_V2_TACTIC_FILTER_PILL_TEST_ID}
                color="hollow"
                iconType="cross"
                iconSide="right"
                iconOnClick={handleClearTactic}
                iconOnClickAriaLabel={TACTIC_FILTER_V2_CLEAR_LABEL}
              >
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.tab.filteredByPill',
                  {
                    defaultMessage: 'Filtered by: {tactic}',
                    values: { tactic: selectedTactic },
                  }
                )}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}
      <AnomalyTimelineSectionV2 timeRangeMs={timeRangeMs} selectedTactic={selectedTactic} />
      <EuiSpacer size="l" />
      <AnomaliesTableSectionV2 selectedTactic={selectedTactic} />
    </div>
  );
};
