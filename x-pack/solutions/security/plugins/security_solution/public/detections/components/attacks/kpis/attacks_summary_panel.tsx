/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from '@emotion/styled';
import type { Query } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { AttacksListPanel } from './attacks_list_panel/attacks_list_panel';
import { AttacksVolumePanel } from './attacks_volume_panel/attacks_volume_panel';
import { KpiPanel } from '../../alerts_kpis/common/components';
import { HeaderSection } from '../../../../common/components/header_section';
import { KPIS_SECTION } from './kpis_section';
import { CHART_PANEL_HEIGHT } from './common/constants';
import type { AttacksKpiPanelBaseProps } from './types';

const StyledFlexGroup = styled(EuiFlexGroup)`
  @media only screen and (min-width: ${(props) => props.theme.euiTheme.breakpoint.l}) {
  }
`;

const StyledFlexItem = styled(EuiFlexItem)`
  min-width: 355px;
`;

export interface AttacksSummaryPanelProps extends AttacksKpiPanelBaseProps {
  /** Search query string */
  query?: Query;
  /** DataView for the attacks page */
  dataView: DataView;
}

/**
 * Renders the content for the "Summary" KPI view.
 * Displays summary visualizations like AttacksVolumePanel and AttacksListPanel.
 */
export const AttacksSummaryPanel: React.FC<AttacksSummaryPanelProps> = React.memo(
  ({ filters, query, dataView, title, isExpanded, setIsExpanded }) => {
    return (
      <KpiPanel
        data-test-subj={KPIS_SECTION}
        hasBorder
        paddingSize="m"
        $toggleStatus={isExpanded}
        height={CHART_PANEL_HEIGHT}
      >
        <HeaderSection
          alignHeader="flexStart"
          hideSubtitle
          title={title}
          titleSize={'s'}
          toggleStatus={isExpanded}
          toggleQuery={setIsExpanded}
        />
        {isExpanded && (
          <StyledFlexGroup
            data-test-subj="summary-view-content"
            className="eui-yScroll"
            wrap
            gutterSize="m"
          >
            <EuiFlexItem grow={false}>
              <AttacksListPanel filters={filters} query={query} dataView={dataView} />
            </EuiFlexItem>
            <StyledFlexItem>
              <AttacksVolumePanel filters={filters} query={query} />
            </StyledFlexItem>
          </StyledFlexGroup>
        )}
      </KpiPanel>
    );
  }
);
AttacksSummaryPanel.displayName = 'AttacksSummaryPanel';
