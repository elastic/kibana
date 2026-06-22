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
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getAbbreviatedNumber } from '@kbn/cloud-security-posture-common';
import type { EntityDetailsPath } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { ExpandablePanel } from '../../../flyout_v2/shared/components/expandable_panel';
import { MitreAttackChain } from './mitre/components/mitre_attack_chain';
// All v.3 mock data lives in the `behavioral_anomalies_v3/` folder. Keeping
// the right-panel overview wired to the same source as the BA-v.3 left tab
// guarantees the Attack chain and the Anomalies table show identical
// numbers (per-tactic counts sum to `MOCK_ANOMALY_V3_TOTAL_COUNT`).
// Cleanup: when v.3 is removed, this overview file goes away with it.
import {
  MOCK_ANOMALY_COUNT_BY_TACTIC_V3,
  MOCK_TRIGGERED_TACTICS_V3,
} from '../behavioral_anomalies_v3/mock_tab_data';
import { MOCK_ANOMALY_V3_TOTAL_COUNT } from '../behavioral_anomalies_v3/mock_data';
import {
  BEHAVIORAL_ANOMALIES_ALL_LINK_TITLE,
  BEHAVIORAL_ANOMALIES_ALL_LINK_TOOLTIP,
  BEHAVIORAL_ANOMALIES_COUNT_LABEL,
} from './translations';
import {
  BEHAVIORAL_ANOMALIES_V3_OVERVIEW_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TACTICS_CHAIN_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TACTICS_COUNT_TEST_ID,
} from './test_ids';

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
          <MitreAttackChain
            triggeredTactics={MOCK_TRIGGERED_TACTICS_V3}
            anomalyCountByTactic={MOCK_ANOMALY_COUNT_BY_TACTIC_V3}
            showLabels={false}
            data-test-subj={BEHAVIORAL_ANOMALIES_V3_TACTICS_CHAIN_TEST_ID}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};
