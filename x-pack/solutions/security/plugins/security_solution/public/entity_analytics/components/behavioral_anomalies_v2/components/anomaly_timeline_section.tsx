/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { useAnomalyBands } from '../../recent_anomalies/anomaly_bands';
import { BehavioralAnomaliesV2Swimlane } from '../behavioral_anomalies_swimlane';
import { SeverityLegendControlV2 } from './severity_legend_control';
import type { SeverityOptionV2 } from '../hooks/use_severity_options';
import { useSeverityOptionsV2 } from '../hooks/use_severity_options';
import { getTimelineHeatmapRecordsV2, getTimelineRowKeysV2 } from '../mock_tab_data';
import { MITRE_TACTIC_NAMES } from '../../behavioral_anomalies/mitre/tactics';
import type { ViewByFieldV2 } from '../types';
import { ANOMALY_TIMELINE_V2_TITLE } from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V2_TIMELINE_SECTION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_TIMELINE_SWIMLANE_TEST_ID,
} from '../test_ids';
import { TimelineRowLabelsV2 } from './timeline_row_labels';

/**
 * Swim lane rows are always grouped by MITRE ATT&CK tactic in v.2 — fixed at
 * 15 tactic rows (no "View by" control, no pagination because the row count
 * is bounded).
 */
const FIXED_VIEW_BY: ViewByFieldV2 = 'mitre_tactic';

/**
 * Precomputed kill-chain index for each tactic. Used by the heatmap's custom
 * `ySortPredicate` to preserve canonical order top-to-bottom regardless of
 * the order records arrive in.
 */
const TACTIC_INDEX_BY_NAME: ReadonlyMap<string, number> = new Map(
  MITRE_TACTIC_NAMES.map((name, index) => [name, index])
);

/**
 * Heatmap renders the first sorted value at the top of the Y-axis, so an
 * ascending sort by kill-chain index places "Reconnaissance" at the top and
 * "Impact" at the bottom — the order called for by the design.
 */
const tacticOrderComparator = (a: string | number, b: string | number): number => {
  const ai = TACTIC_INDEX_BY_NAME.get(String(a)) ?? Number.MAX_SAFE_INTEGER;
  const bi = TACTIC_INDEX_BY_NAME.get(String(b)) ?? Number.MAX_SAFE_INTEGER;
  return ai - bi;
};

interface AnomalyTimelineSectionV2Props {
  /**
   * Selected timeline window (millis). Owned by the parent tab so the time
   * picker can live at the top of the tab content rather than inside this
   * section.
   */
  timeRangeMs: { from: number; to: number };
  /**
   * Tab-level tactic filter. When set, the swim lane collapses to a single
   * row for that tactic; when null/undefined, all 15 tactic rows render.
   */
  selectedTactic?: string | null;
}

export const AnomalyTimelineSectionV2: React.FC<AnomalyTimelineSectionV2Props> = ({
  timeRangeMs,
  selectedTactic,
}) => {
  const { bands } = useAnomalyBands();
  const severityOptions = useSeverityOptionsV2();
  const [selectedSeverities, setSelectedSeverities] =
    useState<SeverityOptionV2[]>(severityOptions);
  const handleSeverityChange = useCallback((next: SeverityOptionV2[]) => {
    setSelectedSeverities(next);
  }, []);

  // 15 MITRE tactics rendered as Y-axis rows by default. When the tab-level
  // tactic filter is set, collapse to the single matching row so the swim
  // lane reads as a focused per-tactic timeline.
  const rowKeys = useMemo(() => {
    const allKeys = getTimelineRowKeysV2(FIXED_VIEW_BY);
    if (selectedTactic && allKeys.includes(selectedTactic)) {
      return [selectedTactic];
    }
    return allKeys;
  }, [selectedTactic]);
  const rowLabels = useMemo(
    () => rowKeys.map((rowKey) => ({ id: rowKey, label: rowKey })),
    [rowKeys]
  );

  const heatmapRecords = useMemo(
    () => getTimelineHeatmapRecordsV2(rowKeys, FIXED_VIEW_BY, timeRangeMs),
    [rowKeys, timeRangeMs]
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
          entityNames={rowKeys}
          entityAccessor={FIXED_VIEW_BY}
          heatmapId="entity-flyout-behavioral-anomalies-v2-detail-heatmap"
          timeRangeMs={timeRangeMs}
          ySortPredicate={tacticOrderComparator}
        />
      </EuiFlexGroup>
    </div>
  );
};
