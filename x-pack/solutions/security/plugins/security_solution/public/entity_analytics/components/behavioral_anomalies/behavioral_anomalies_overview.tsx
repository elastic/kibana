/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { BehavioralAnomaliesSwimlane } from './behavioral_anomalies_swimlane';
import { getMockBehavioralAnomaliesSummary } from './mock_data';
import {
  BEHAVIORAL_ANOMALIES_ALL_LINK_TITLE,
  BEHAVIORAL_ANOMALIES_ALL_LINK_TOOLTIP,
  BEHAVIORAL_ANOMALIES_COUNT_LABEL,
} from './translations';
import {
  BEHAVIORAL_ANOMALIES_COUNT_TEST_ID,
  BEHAVIORAL_ANOMALIES_HEATMAP_TEST_ID,
  BEHAVIORAL_ANOMALIES_OVERVIEW_TEST_ID,
} from './test_ids';

interface BehavioralAnomaliesOverviewProps {
  entityId: string;
  isPreviewMode: boolean;
  openDetailsPanel: (path: EntityDetailsPath) => void;
}

const AnomaliesCount = ({ total }: { total: number }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3 data-test-subj={BEHAVIORAL_ANOMALIES_COUNT_TEST_ID}>
              {getAbbreviatedNumber(total)}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            {BEHAVIORAL_ANOMALIES_COUNT_LABEL}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

export const BehavioralAnomaliesOverview: React.FC<BehavioralAnomaliesOverviewProps> = ({
  entityId: _entityId,
  isPreviewMode,
  openDetailsPanel,
}) => {
  const { euiTheme } = useEuiTheme();
  const { bands } = useAnomalyBands();
  const summary = useMemo(() => getMockBehavioralAnomaliesSummary(), []);
  const entityNames = useMemo(() => [BEHAVIORAL_ANOMALIES_PROTOTYPE_ENTITY_ID], []);

  const goToBehavioralAnomaliesTab = useCallback(
    () => openDetailsPanel({ tab: EntityDetailsLeftPanelTab.BEHAVIORAL_ANOMALIES }),
    [openDetailsPanel]
  );

  const link = useMemo(
    () => ({
      callback: goToBehavioralAnomaliesTab,
      tooltip: BEHAVIORAL_ANOMALIES_ALL_LINK_TOOLTIP,
    }),
    [goToBehavioralAnomaliesTab]
  );

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
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        responsive={false}
        data-test-subj={BEHAVIORAL_ANOMALIES_HEATMAP_TEST_ID}
        css={css`
          width: 100%;

          & > .euiFlexItem:last-child {
            flex: 1;
            min-width: 180px;
          }
        `}
      >
        <AnomaliesCount total={summary.totalCount} />
        <BehavioralAnomaliesSwimlane
          records={summary.heatmapRecords}
          anomalyBands={bands}
          entityNames={entityNames}
          entityAccessor="entity_id"
          heatmapId="entity-flyout-behavioral-anomalies-heatmap"
        />
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </ExpandablePanel>
  );
};
