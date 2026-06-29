/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useAnomalyBands } from '../../recent_anomalies/anomaly_bands';
import { BehavioralAnomaliesV3Swimlane } from '../behavioral_anomalies_swimlane';
import { getTimelineHeatmapRecordsV3, getTimelineRowKeysV3 } from '../mock_tab_data';
import { MITRE_TACTIC_NAMES } from '../../behavioral_anomalies/mitre/tactics';
import type { ViewByFieldV3 } from '../types';
import {
  ANOMALY_TIMELINE_V3_INFO_ICON_ARIA_LABEL,
  ANOMALY_TIMELINE_V3_INFO_POPOVER_PARAGRAPH_1,
  ANOMALY_TIMELINE_V3_INFO_POPOVER_PARAGRAPH_2,
  ANOMALY_TIMELINE_V3_INFO_POPOVER_PARAGRAPH_3,
  ANOMALY_TIMELINE_V3_INFO_POPOVER_TITLE,
  ANOMALY_TIMELINE_V3_READ_DOCS,
  ANOMALY_TIMELINE_V3_TITLE,
} from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V3_TIMELINE_ACCORDION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TIMELINE_INFO_BUTTON_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TIMELINE_INFO_DOCS_LINK_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TIMELINE_INFO_POPOVER_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TIMELINE_SECTION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TIMELINE_SWIMLANE_TEST_ID,
} from '../test_ids';
import { TimelineRowLabelsV3 } from './timeline_row_labels';

/**
 * Swim lane rows are always grouped by MITRE ATT&CK tactic in v.2 — fixed at
 * 15 tactic rows (no "View by" control, no pagination because the row count
 * is bounded).
 */
const FIXED_VIEW_BY: ViewByFieldV3 = 'mitre_tactic';

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

/** Public documentation about ML anomaly scoring referenced by the info popover. */
const ANOMALY_DOCS_HREF =
  'https://www.elastic.co/docs/explore-analyze/machine-learning/anomaly-detection/ml-ad-explain';

interface AnomalyTimelineSectionV3Props {
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
  /**
   * Tab-level Anomaly score filter. When provided, only cells whose
   * underlying anomaly score falls into one of the selected severity
   * buckets are emitted. `undefined` = no filter (all buckets selected).
   */
  allowedSeverityThresholds?: ReadonlySet<number>;
}

export const AnomalyTimelineSectionV3: React.FC<AnomalyTimelineSectionV3Props> = ({
  timeRangeMs,
  selectedTactic,
  allowedSeverityThresholds,
}) => {
  const { bands } = useAnomalyBands();

  // Info popover state is independent from the accordion expanded state.
  // The trigger is rendered as an `EuiButtonIcon` so the user gets the
  // standard EUI icon-button hover affordance (subtle gray, not blue).
  // `stopPropagation` on click/keydown keeps the click from bubbling up and
  // toggling the accordion when the user opens the popover.
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const toggleInfo = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setIsInfoOpen((open) => !open);
  }, []);
  const closeInfo = useCallback(() => setIsInfoOpen(false), []);

  // 15 MITRE tactics rendered as Y-axis rows by default. When the tab-level
  // tactic filter is set, collapse to the single matching row so the swim
  // lane reads as a focused per-tactic timeline.
  const rowKeys = useMemo(() => {
    const allKeys = getTimelineRowKeysV3(FIXED_VIEW_BY);
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
    () =>
      getTimelineHeatmapRecordsV3(rowKeys, FIXED_VIEW_BY, timeRangeMs, allowedSeverityThresholds),
    [rowKeys, timeRangeMs, allowedSeverityThresholds]
  );

  // Title row rendered as `buttonContent`. The info trigger is an
  // EuiButtonIcon so the user sees the standard EUI icon-button hover
  // affordance. The button is intentionally sized to a 16x16 container
  // (overrides EUI defaults) to sit tight next to the title.
  // NOTE: this nests a <button> (icon) inside the accordion's own <button>.
  // Browsers tolerate this and `stopPropagation` keeps click semantics
  // correct — the trade-off is accepted here in favor of the standard
  // EuiButtonIcon hover/focus styling the design calls for.
  const accordionButtonContent = (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{ANOMALY_TIMELINE_V3_TITLE}</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          isOpen={isInfoOpen}
          closePopover={closeInfo}
          anchorPosition="downLeft"
          data-test-subj={BEHAVIORAL_ANOMALIES_V3_TIMELINE_INFO_POPOVER_TEST_ID}
          button={
            <EuiButtonIcon
              iconType="info"
              size="xs"
              display="empty"
              color="text"
              aria-label={ANOMALY_TIMELINE_V3_INFO_ICON_ARIA_LABEL}
              aria-expanded={isInfoOpen}
              data-test-subj={BEHAVIORAL_ANOMALIES_V3_TIMELINE_INFO_BUTTON_TEST_ID}
              onClick={toggleInfo}
            />
          }
        >
          {/* Default EuiPopover paddings — `panelPaddingSize` (panel),
              EuiPopoverTitle, and EuiPopoverFooter each fall back to EUI's
              defaults; the body only constrains its max width so long
              paragraphs wrap to a readable measure. */}
          <EuiPopoverTitle>{ANOMALY_TIMELINE_V3_INFO_POPOVER_TITLE}</EuiPopoverTitle>
          <div
            css={css`
              max-width: 360px;
            `}
          >
            <EuiText size="s">
              <p>{ANOMALY_TIMELINE_V3_INFO_POPOVER_PARAGRAPH_1}</p>
              <p>{ANOMALY_TIMELINE_V3_INFO_POPOVER_PARAGRAPH_2}</p>
              <p>{ANOMALY_TIMELINE_V3_INFO_POPOVER_PARAGRAPH_3}</p>
            </EuiText>
          </div>
          <EuiPopoverFooter>
            <EuiButtonEmpty
              data-test-subj={BEHAVIORAL_ANOMALIES_V3_TIMELINE_INFO_DOCS_LINK_TEST_ID}
              size="s"
              flush="left"
              iconType="external"
              iconSide="right"
              href={ANOMALY_DOCS_HREF}
              target="_blank"
              rel="noopener noreferrer"
            >
              {ANOMALY_TIMELINE_V3_READ_DOCS}
            </EuiButtonEmpty>
          </EuiPopoverFooter>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <div data-test-subj={BEHAVIORAL_ANOMALIES_V3_TIMELINE_SECTION_TEST_ID}>
      <EuiAccordion
        id="behavioralAnomaliesV3AnomalyTimelineAccordion"
        data-test-subj={BEHAVIORAL_ANOMALIES_V3_TIMELINE_ACCORDION_TEST_ID}
        initialIsOpen
        buttonContent={accordionButtonContent}
      >
        <EuiSpacer size="m" />
        <EuiFlexGroup data-test-subj={BEHAVIORAL_ANOMALIES_V3_TIMELINE_SWIMLANE_TEST_ID}>
          <TimelineRowLabelsV3 rows={rowLabels} compressed />
          <BehavioralAnomaliesV3Swimlane
            records={heatmapRecords}
            anomalyBands={bands}
            entityNames={rowKeys}
            entityAccessor={FIXED_VIEW_BY}
            heatmapId="entity-flyout-behavioral-anomalies-v3-detail-heatmap"
            timeRangeMs={timeRangeMs}
            ySortPredicate={tacticOrderComparator}
          />
        </EuiFlexGroup>
      </EuiAccordion>
    </div>
  );
};
