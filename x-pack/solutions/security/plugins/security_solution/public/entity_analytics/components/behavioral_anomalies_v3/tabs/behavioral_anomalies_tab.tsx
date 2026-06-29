/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import {
  DateRangePicker,
  type DateRangePickerOnChangeProps,
  type DateRangePickerSettings,
  type TimeRangeBoundsOption,
} from '@kbn/date-range-picker';
import dateMath from '@kbn/datemath';
import { ML_PAGES, useMlManagementHref } from '@kbn/ml-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import { AnomaliesTableSectionV3 } from '../components/anomalies_table_section';
import { AnomalyTimelineSectionV3 } from '../components/anomaly_timeline_section';
import { AttackChainSectionV3 } from '../components/attack_chain_section';
import { SeverityLegendControlV3 } from '../components/severity_legend_control';
import type { SeverityOptionV3 } from '../hooks/use_severity_options';
import { useSeverityOptionsV3 } from '../hooks/use_severity_options';
import {
  DEFAULT_TIMELINE_RANGE_V3,
  getAttackChainDataForRangeV3,
} from '../mock_tab_data';
import { ANOMALY_TIMELINE_V3_MANAGE_ML_JOBS } from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V3_DATE_PICKER_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_MANAGE_ML_JOBS_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TAB_CONTENT_TEST_ID,
} from '../test_ids';

const resolveTimeMillis = (value: string, roundUp: boolean): number => {
  const parsed = dateMath.parse(value, { roundUp })?.valueOf();
  if (typeof parsed === 'number' && Number.isFinite(parsed)) {
    return parsed;
  }
  const native = new Date(value).getTime();
  return Number.isFinite(native) ? native : Date.now();
};

// Presets mirror the ones shipped with the new Discover date picker so users
// see a familiar dropdown of common ranges.
const TIME_RANGE_PRESETS_V3: TimeRangeBoundsOption[] = [
  { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
  { start: 'now-30m', end: 'now', label: 'Last 30 minutes' },
  { start: 'now-1h', end: 'now', label: 'Last 1 hour' },
  { start: 'now-24h', end: 'now', label: 'Last 24 hours' },
  { start: 'now-7d', end: 'now', label: 'Last 7 days' },
  { start: 'now-30d', end: 'now', label: 'Last 30 days' },
  { start: 'now-90d', end: 'now', label: 'Last 90 days' },
  { start: 'now-1y', end: 'now', label: 'Last 1 year' },
];

const DEFAULT_PICKER_VALUE_V3 = 'last 30 days';
const DEFAULT_SETTINGS_V3: DateRangePickerSettings = {
  roundRelativeTime: true,
  timePrecision: 's',
};

export const BehavioralAnomaliesV3Tab: React.FC = () => {
  // The new Kibana date range picker is *controlled* via a single text value
  // (e.g. "last 30 days" or "now-7d to now"). We additionally keep the
  // resolved `start`/`end` date-math strings around so the swim lane and the
  // Anomalies table can derive absolute millisecond bounds from them.
  const [pickerValue, setPickerValue] = useState<string>(DEFAULT_PICKER_VALUE_V3);
  const [start, setStart] = useState<string>(DEFAULT_TIMELINE_RANGE_V3.from);
  const [end, setEnd] = useState<string>(DEFAULT_TIMELINE_RANGE_V3.to);
  const [pickerSettings, setPickerSettings] =
    useState<DateRangePickerSettings>(DEFAULT_SETTINGS_V3);
  // Recently used ranges are session-local; the new picker shows them in
  // the "Recent" section of its dialog.
  const [recentRanges, setRecentRanges] = useState<TimeRangeBoundsOption[]>([]);

  // Anomaly score (severity) filter — moved out of the Anomaly timeline
  // section so it sits next to the date picker at the top of the tab. State
  // is owned here so any section that wants to react to it can read off the
  // same source of truth.
  const severityOptions = useSeverityOptionsV3();
  const [selectedSeverities, setSelectedSeverities] =
    useState<SeverityOptionV3[]>(severityOptions);
  const handleSeverityChange = useCallback((next: SeverityOptionV3[]) => {
    setSelectedSeverities(next);
  }, []);

  const handlePickerChange = useCallback((args: DateRangePickerOnChangeProps) => {
    if (args.isInvalid) return;
    setStart(args.start);
    setEnd(args.end);
    setPickerValue(args.value);
    setRecentRanges((prev) => {
      const key = `${args.start}|${args.end}`;
      const deduped = prev.filter((r) => `${r.start}|${r.end}` !== key);
      return [{ start: args.start, end: args.end }, ...deduped].slice(0, 10);
    });
  }, []);

  const timeRangeMs = useMemo(
    () => ({
      from: resolveTimeMillis(start, false),
      to: resolveTimeMillis(end, true),
    }),
    [start, end]
  );

  // Tab-level Anomaly score filter — packaged as a `Set<number>` keyed on
  // each `SeverityOptionV3.val` so the data helpers can do a fast membership
  // check against `getSeverityBucketV3(anomalyScore)`. When the user has all
  // 5 buckets selected we pass `undefined` so the helpers skip the filter
  // path entirely (also covers the "every band selected" common case
  // without re-allocating Sets).
  const allowedSeverityThresholds = useMemo<ReadonlySet<number> | undefined>(() => {
    if (selectedSeverities.length === severityOptions.length) return undefined;
    return new Set(selectedSeverities.map((option) => option.val));
  }, [selectedSeverities, severityOptions.length]);

  // Re-derive triggered tactics + per-tactic counts whenever the picker
  // selection OR the severity filter changes so the Attack chain dots,
  // chip counts, and the Anomalies table total all stay in sync (counts
  // sum to the in-range, in-severity table total — same derivation, same
  // source data).
  const { triggeredTactics, anomalyCountByTactic } = useMemo(
    () => getAttackChainDataForRangeV3(timeRangeMs, allowedSeverityThresholds),
    [timeRangeMs, allowedSeverityThresholds]
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
    <div data-test-subj={BEHAVIORAL_ANOMALIES_V3_TAB_CONTENT_TEST_ID}>
      {/* Top tab bar: time picker + anomaly score filter on the left,
          "Manage ML jobs" on the right. The inner flex group keeps the date
          picker and the severity filter 8 px apart (`gutterSize="s"`). */}
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        gutterSize="s"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
            wrap={false}
          >
            <EuiFlexItem grow={false}>
              {/* Latest Kibana date range picker (`@kbn/date-range-picker`) —
                  the same component used by the modern Discover top nav.
                  Drives the tab-level `timeRangeMs` that feeds the Attack
                  chain, swim lane, and Anomalies table. */}
              <DateRangePicker
                value={pickerValue}
                onChange={handlePickerChange}
                settings={pickerSettings}
                onSettingsChange={setPickerSettings}
                presets={TIME_RANGE_PRESETS_V3}
                recent={recentRanges}
                width="auto"
                compressed
                data-test-subj={BEHAVIORAL_ANOMALIES_V3_DATE_PICKER_TEST_ID}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/* Anomaly score filter — moved up from the timeline section so
                  it lives next to the time picker at the tab level. */}
              <SeverityLegendControlV3
                allSeverityOptions={severityOptions}
                selectedSeverities={selectedSeverities}
                onChange={handleSeverityChange}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj={BEHAVIORAL_ANOMALIES_V3_MANAGE_ML_JOBS_TEST_ID}
            color="primary"
            size="s"
            iconType="external"
            iconSide="right"
            href={manageJobsHref}
            target="_blank"
            isDisabled={!manageJobsHref}
          >
            {ANOMALY_TIMELINE_V3_MANAGE_ML_JOBS}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      {/* New "Attack chain" section sits above the timeline per design v.2.
          Cleanup: delete this block + `AttackChainSectionV3` import + the
          `triggeredTactics` memo above if the chain is removed. */}
      <AttackChainSectionV3
        triggeredTactics={triggeredTactics}
        anomalyCountByTactic={anomalyCountByTactic}
        selectedTactic={selectedTactic}
        onSelectTactic={handleSelectTactic}
      />
      <EuiSpacer size="l" />
      {/* No separate "Filtered by" pill — the per-tactic hover chip in the
          chain above doubles as the active-filter indicator and exposes
          its own clear-filter cross icon (matches the alerts
          DistributionBar pattern). */}
      <AnomalyTimelineSectionV3
        timeRangeMs={timeRangeMs}
        selectedTactic={selectedTactic}
        allowedSeverityThresholds={allowedSeverityThresholds}
      />
      <EuiSpacer size="l" />
      {/* The Anomalies table is also bounded by the tab-level time range
          AND the tab-level Anomaly score filter so every section of the
          v.3 tab stays in sync with the toolbar controls. */}
      <AnomaliesTableSectionV3
        selectedTactic={selectedTactic}
        timeRangeMs={timeRangeMs}
        allowedSeverityThresholds={allowedSeverityThresholds}
      />
    </div>
  );
};
