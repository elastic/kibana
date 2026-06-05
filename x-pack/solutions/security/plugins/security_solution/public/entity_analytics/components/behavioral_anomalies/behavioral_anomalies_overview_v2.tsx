/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Prototype "v.2" of the Behavioral anomalies right-panel overview.
 *
 * Layout (top → bottom):
 *  - "All anomalies" link in the ExpandablePanel header.
 *  - Tactics row: "<N> Tactics" stat on the left, MITRE ATT&CK dots-only
 *    chain on the right (no labels).
 *  - Anomalies row: "<N> Anomalies" stat on the left, year-at-a-glance swim
 *    lane on the right (last 1 year, weekly buckets, date x-axis).
 *
 * Toggled at runtime via the temporary version selector in
 * `behavioral_anomalies_section.tsx`. The matching "Last 1 year" indicator on
 * the section title is also rendered conditionally from that file.
 *
 * Cleanup before hand-off (pick ONE of the two paths):
 *  - Keep v.1: delete this file, `behavioral_anomalies_swimlane_v2.tsx`,
 *    `mock_data_v2.ts`, and the entire `mitre/` folder. Then drop the v.2
 *    import / state / button group / extraAction / conditional in
 *    `behavioral_anomalies_section.tsx`.
 *  - Keep v.2: delete `behavioral_anomalies_overview.tsx` (v.1). Then drop
 *    the v.1 import / state / button group / conditional in
 *    `behavioral_anomalies_section.tsx`, and unconditionally render the
 *    "Last 1 year" extraAction.
 * v.2-specific helpers (swimlane_v2, mock_data_v2, mitre/) are only
 * referenced from this file + the BA-v.2 left tab.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getAbbreviatedNumber } from '@kbn/cloud-security-posture-common';
import type { EntityDetailsPath } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { ExpandablePanel } from '../../../flyout_v2/shared/components/expandable_panel';
import { useAnomalyBands } from '../recent_anomalies/anomaly_bands';
import { BEHAVIORAL_ANOMALIES_PROTOTYPE_ENTITY_ID } from './constants';
import { BehavioralAnomaliesSwimlaneV2 } from './behavioral_anomalies_swimlane_v2';
import { getMockBehavioralAnomaliesV2Summary } from './mock_data_v2';
import { MOCK_ANOMALY_COUNT_BY_TACTIC_V2 } from './mitre/mock_anomaly_tactics';
import { MitreAttackChain } from './mitre/components/mitre_attack_chain';
import {
  BEHAVIORAL_ANOMALIES_ALL_LINK_TITLE,
  BEHAVIORAL_ANOMALIES_ALL_LINK_TOOLTIP,
  BEHAVIORAL_ANOMALIES_COUNT_LABEL,
  BEHAVIORAL_ANOMALIES_V2_TACTICS_COUNT_LABEL,
} from './translations';
import {
  BEHAVIORAL_ANOMALIES_COUNT_TEST_ID,
  BEHAVIORAL_ANOMALIES_HEATMAP_TEST_ID,
  BEHAVIORAL_ANOMALIES_OVERVIEW_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_TACTICS_CHAIN_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_TACTICS_COUNT_TEST_ID,
} from './test_ids';

interface BehavioralAnomaliesOverviewV2Props {
  entityId: string;
  isPreviewMode: boolean;
  openDetailsPanel: (path: EntityDetailsPath) => void;
}

/**
 * Compact stat block: large number stacked above a small label, used as the
 * left "cell" of both the Tactics row and the Anomalies row.
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

export const BehavioralAnomaliesOverviewV2: React.FC<BehavioralAnomaliesOverviewV2Props> = ({
  entityId: _entityId,
  isPreviewMode,
  openDetailsPanel,
}) => {
  const { euiTheme } = useEuiTheme();
  const { bands } = useAnomalyBands();
  const summary = useMemo(() => getMockBehavioralAnomaliesV2Summary(), []);
  const entityNames = useMemo(() => [BEHAVIORAL_ANOMALIES_PROTOTYPE_ENTITY_ID], []);

  // v.2 overview opens the matching v.2 left-flyout tab. If v.2 is the chosen
  // version at hand-off, swap this to `EntityDetailsLeftPanelTab.BEHAVIORAL_ANOMALIES`
  // after the v.1 tab has been removed and the v.2 tab is renamed.
  const goToBehavioralAnomaliesTab = useCallback(
    () => openDetailsPanel({ tab: EntityDetailsLeftPanelTab.BEHAVIORAL_ANOMALIES_V2 }),
    [openDetailsPanel]
  );

  const link = useMemo(
    () => ({
      callback: goToBehavioralAnomaliesTab,
      tooltip: BEHAVIORAL_ANOMALIES_ALL_LINK_TOOLTIP,
    }),
    [goToBehavioralAnomaliesTab]
  );

  // Both rows use the same template: stat block on the left (`grow={false}`,
  // fixed minimum width so the two stat blocks line up vertically) and the
  // visualization on the right (stretches to fill remaining width).
  const statCellCss = css`
    min-width: 72px;
  `;
  const vizCellCss = css`
    flex: 1;
    min-width: 0;
  `;

  return (
    <ExpandablePanel
      data-test-subj={BEHAVIORAL_ANOMALIES_OVERVIEW_TEST_ID}
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
      {/* Row 1: tactics */}
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false} css={statCellCss}>
          <StatBlock
            total={summary.triggeredTacticsCount}
            label={BEHAVIORAL_ANOMALIES_V2_TACTICS_COUNT_LABEL}
            countTestSubj={BEHAVIORAL_ANOMALIES_V2_TACTICS_COUNT_TEST_ID}
          />
        </EuiFlexItem>
        <EuiFlexItem css={vizCellCss}>
          <MitreAttackChain
            triggeredTactics={summary.triggeredTactics}
            anomalyCountByTactic={MOCK_ANOMALY_COUNT_BY_TACTIC_V2}
            showLabels={false}
            data-test-subj={BEHAVIORAL_ANOMALIES_V2_TACTICS_CHAIN_TEST_ID}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* 32px gap between Tactics row and Anomalies row per design spec. */}
      <EuiSpacer size="xl" />
      {/* Row 2: anomalies (swim lane). The swim lane renders its own
          EuiFlexItem, so we use a child selector to size it to fill the row. */}
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        responsive={false}
        data-test-subj={BEHAVIORAL_ANOMALIES_HEATMAP_TEST_ID}
        css={css`
          & > .euiFlexItem:last-child {
            flex: 1;
            min-width: 180px;
          }
        `}
      >
        <EuiFlexItem grow={false} css={statCellCss}>
          <StatBlock
            total={summary.totalCount}
            label={BEHAVIORAL_ANOMALIES_COUNT_LABEL}
            countTestSubj={BEHAVIORAL_ANOMALIES_COUNT_TEST_ID}
          />
        </EuiFlexItem>
        <BehavioralAnomaliesSwimlaneV2
          records={summary.heatmapRecords}
          anomalyBands={bands}
          entityNames={entityNames}
          entityAccessor="entity_id"
          heatmapId="entity-flyout-behavioral-anomalies-v2-heatmap"
        />
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </ExpandablePanel>
  );
};
