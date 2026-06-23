/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Prototype "v.3" of the Behavioral anomalies right-panel overview.
 *
 * Same layout as v.2 BUT the swim lane row is removed — v.3 shows only the
 * MITRE ATT&CK tactics chain. The "All anomalies" link opens the matching
 * BA-v.3 left-flyout tab.
 *
 * Toggled at runtime via the temporary version selector in
 * `behavioral_anomalies_section.tsx` (v.3 is the leading / default option).
 * The matching "Last 1 year" indicator on the section title is also rendered
 * for v.3 from that file.
 *
 * Cleanup before hand-off — only one version should ship:
 *  - Drop v.3: delete this file. Then remove the v.3 entry from
 *    `behavioral_anomalies_section.tsx` (import, union member, default,
 *    VERSION_OPTIONS row, conditional render branch, and the v.3 case in the
 *    timeframe extraAction).
 *  - Keep v.3 (drop v.1 + v.2): also remove the `behavioral_anomalies_v2/`
 *    folder, the v.1 / v.2 files in this folder, and unconditionally render
 *    this component + the "Last 1 year" extraAction from
 *    `behavioral_anomalies_section.tsx`.
 *
 * The MITRE chain visual component lives under `./mitre/` and is shared with
 * v.2 (don't delete `mitre/` until BOTH v.2 and v.3 are removed). The
 * per-tactic anomaly counts shown by the chain come from the BA-v.3 mock
 * table source so the chain stays consistent with the Anomalies table.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getAbbreviatedNumber } from '@kbn/cloud-security-posture-common';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import type { EntityDetailsPath } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { ExpandablePanel } from '../../../flyout_v2/shared/components/expandable_panel';
import { MitreAttackChainV3 } from './mitre/components/mitre_attack_chain_v3';
// All v.3 mock data lives in the `behavioral_anomalies_v3/` folder. Keeping
// the right-panel overview wired to the same source as the BA-v.3 left tab
// guarantees the Attack chain, the Anomalies table, and the Recent
// anomalies table (3 latest rows) all show identical numbers.
// Cleanup: when v.3 is removed, this overview file goes away with it.
import {
  MOCK_ANOMALY_COUNT_BY_TACTIC_V3,
  MOCK_ANOMALY_V3_TABLE_ROWS,
  MOCK_TRIGGERED_TACTICS_V3,
} from '../behavioral_anomalies_v3/mock_tab_data';
import { MOCK_ANOMALY_V3_TOTAL_COUNT } from '../behavioral_anomalies_v3/mock_data';
import { AnomalyJobNameCellV3 } from '../behavioral_anomalies_v3/components/anomaly_job_name_cell';
import { TruncatedTextCellV3 } from '../behavioral_anomalies_v3/components/truncated_text_cell';
import type { BehavioralAnomalyV3TableRow } from '../behavioral_anomalies_v3/types';
import {
  ANOMALIES_TABLE_V3_ANOMALY_COLUMN,
  ANOMALIES_TABLE_V3_JOB_COLUMN,
  ANOMALIES_TABLE_V3_TIMESTAMP_COLUMN,
} from '../behavioral_anomalies_v3/translations';
import {
  BEHAVIORAL_ANOMALIES_ALL_LINK_TITLE,
  BEHAVIORAL_ANOMALIES_ALL_LINK_TOOLTIP,
  BEHAVIORAL_ANOMALIES_COUNT_LABEL,
  BEHAVIORAL_ANOMALIES_V3_RECENT_HEADING,
} from './translations';
import {
  BEHAVIORAL_ANOMALIES_V3_OVERVIEW_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_RECENT_HEADING_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_RECENT_TABLE_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TACTICS_CHAIN_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TACTICS_COUNT_TEST_ID,
} from './test_ids';

/** How many "Recent anomalies" rows to surface in the right-panel overview. */
const RECENT_ANOMALIES_V3_LIMIT = 3;

// Column widths for the Recent anomalies table — the design calls for the
// Anomaly column to be 20% narrower than each of the other two, while still
// flexing with the right-panel width. With ratio 1 : 1 : 0.8 the percentages
// resolve to roughly 35.71% / 35.71% / 28.57% (= 100% total).
const RECENT_TABLE_OTHER_COLUMN_WIDTH = '35.71%';
const RECENT_TABLE_ANOMALY_COLUMN_WIDTH = '28.57%';

interface BehavioralAnomaliesOverviewV3Props {
  entityId: string;
  isPreviewMode: boolean;
  openDetailsPanel: (path: EntityDetailsPath) => void;
}

/**
 * Compact stat block: large number stacked above a small label. Mirrors the
 * one used in the v.2 overview but kept local so this file is self-contained
 * and can be deleted in one step.
 */
const StatBlock: React.FC<{
  total: number;
  label: string;
  countTestSubj: string;
}> = ({ total, label, countTestSubj }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiTitle size="s">
          <h3 data-test-subj={countTestSubj}>{getAbbreviatedNumber(total)}</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText
          size="xs"
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
        >
          {label}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const BehavioralAnomaliesOverviewV3: React.FC<BehavioralAnomaliesOverviewV3Props> = ({
  entityId: _entityId,
  isPreviewMode,
  openDetailsPanel,
}) => {
  const { euiTheme } = useEuiTheme();

  // v.3 overview opens the matching v.3 left-flyout tab.
  const goToBehavioralAnomaliesV3Tab = useCallback(
    () => openDetailsPanel({ tab: EntityDetailsLeftPanelTab.BEHAVIORAL_ANOMALIES_V3 }),
    [openDetailsPanel]
  );

  const link = useMemo(
    () => ({
      callback: goToBehavioralAnomaliesV3Tab,
      tooltip: BEHAVIORAL_ANOMALIES_ALL_LINK_TOOLTIP,
    }),
    [goToBehavioralAnomaliesV3Tab]
  );

  // Top-3 most recent rows from the same source as the left-tab Anomalies
  // table, sorted by timestamp desc. Slicing keeps the right-panel preview
  // perfectly aligned with "the 3 latest" the user sees when they open the
  // full table.
  const recentAnomaliesV3 = useMemo<BehavioralAnomalyV3TableRow[]>(
    () =>
      [...MOCK_ANOMALY_V3_TABLE_ROWS]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, RECENT_ANOMALIES_V3_LIMIT),
    []
  );

  // Column set mirrors the left-tab Anomalies table, minus the expander,
  // Tactic, Baseline, Anomaly score, and Actions columns — keeping only the
  // three the design screenshot calls for (Job · Timestamp · Anomaly).
  // Reuses `AnomalyJobNameCellV3` so the ML job name opens the Single Metric
  // Viewer the same way the left tab does.
  const recentAnomaliesColumns: Array<EuiBasicTableColumn<BehavioralAnomalyV3TableRow>> = useMemo(
    () => [
      {
        name: ANOMALIES_TABLE_V3_JOB_COLUMN,
        field: 'jobDisplayName',
        width: RECENT_TABLE_OTHER_COLUMN_WIDTH,
        render: (_jobDisplayName: string, item: BehavioralAnomalyV3TableRow) => (
          <AnomalyJobNameCellV3 row={item} />
        ),
      },
      {
        name: ANOMALIES_TABLE_V3_TIMESTAMP_COLUMN,
        field: 'timestamp',
        width: RECENT_TABLE_OTHER_COLUMN_WIDTH,
        render: (timestamp: number) => (
          <TruncatedTextCellV3
            tooltipContent={<PreferenceFormattedDate value={new Date(timestamp)} />}
          >
            <PreferenceFormattedDate value={new Date(timestamp)} />
          </TruncatedTextCellV3>
        ),
      },
      {
        name: ANOMALIES_TABLE_V3_ANOMALY_COLUMN,
        width: RECENT_TABLE_ANOMALY_COLUMN_WIDTH,
        render: (item: BehavioralAnomalyV3TableRow) => (
          <TruncatedTextCellV3 tooltipContent={item.anomaly}>{item.anomaly}</TruncatedTextCellV3>
        ),
      },
    ],
    []
  );

  // Layout matches the Tactics row in the v.2 overview: stat block on the
  // left (fixed minimum width), chain stretches to fill remaining width.
  const statCellCss = css`
    min-width: 72px;
  `;
  const vizCellCss = css`
    flex: 1;
    min-width: 0;
  `;

  return (
    <ExpandablePanel
      data-test-subj={BEHAVIORAL_ANOMALIES_V3_OVERVIEW_TEST_ID}
      header={{
        iconType: !isPreviewMode ? 'chevronLimitLeft' : undefined,
        title: (
          <EuiText
            size="xs"
            css={{
              fontWeight: euiTheme.font.weight.bold,
            }}
          >
            {BEHAVIORAL_ANOMALIES_ALL_LINK_TITLE}
          </EuiText>
        ),
        link,
      }}
    >
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false} css={statCellCss}>
          {/* Stat now shows total anomalies (matches the Anomalies table in
              the BA-v.3 left tab) instead of the number of triggered
              tactics. */}
          <StatBlock
            total={MOCK_ANOMALY_V3_TOTAL_COUNT}
            label={BEHAVIORAL_ANOMALIES_COUNT_LABEL}
            countTestSubj={BEHAVIORAL_ANOMALIES_V3_TACTICS_COUNT_TEST_ID}
          />
        </EuiFlexItem>
        <EuiFlexItem css={vizCellCss}>
          {/* No `onSelectTactic` here on purpose — the right-panel chain is
              read-only. The hover chip still appears per-tactic, matching
              the alerts-distribution-bar pattern. */}
          <MitreAttackChainV3
            triggeredTactics={MOCK_TRIGGERED_TACTICS_V3}
            anomalyCountByTactic={MOCK_ANOMALY_COUNT_BY_TACTIC_V3}
            showLabels={false}
            data-test-subj={BEHAVIORAL_ANOMALIES_V3_TACTICS_CHAIN_TEST_ID}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* Horizontal rule (16 px margin above + below) separates the tactics
          chain from the Recent anomalies table — keeps the two sub-sections
          visually distinct without a heavy panel boundary. */}
      <EuiHorizontalRule margin="m" />
      {/* "Recent anomalies" sub-section: top-3 of the same source rows the
          BA-v.3 left-tab Anomalies table renders, sorted by timestamp desc.
          The ML job cell reuses `AnomalyJobNameCellV3` so the link target
          (Single Metric Viewer in a new tab) stays consistent with the full
          table. */}
      <EuiTitle size="xxs">
        <h4 data-test-subj={BEHAVIORAL_ANOMALIES_V3_RECENT_HEADING_TEST_ID}>
          {BEHAVIORAL_ANOMALIES_V3_RECENT_HEADING}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiBasicTable
        data-test-subj={BEHAVIORAL_ANOMALIES_V3_RECENT_TABLE_TEST_ID}
        items={recentAnomaliesV3}
        itemId="id"
        columns={recentAnomaliesColumns}
        compressed
      />
    </ExpandablePanel>
  );
};
