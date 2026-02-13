/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from '@emotion/styled';
import type { Filter, Query } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { AttacksListPanel } from './attacks_list_panel/attacks_list_panel';
import { AttacksVolumePanel } from './attacks_volume_panel/attacks_volume_panel';

const StyledFlexGroup = styled(EuiFlexGroup)`
  @media only screen and (min-width: ${(props) => props.theme.euiTheme.breakpoint.l}) {
  }
`;

const StyledFlexItem = styled(EuiFlexItem)`
  min-width: 355px;
`;

export interface SummaryViewContentProps {
  /** Global filters to apply to the charts */
  filters?: Filter[];
  /** Search query string */
  query?: Query;
  /** DataView for the attacks page */
  dataView: DataView;
}

/**
 * Renders the content for the "Summary" KPI view.
 * Displays summary visualizations like AttacksVolumePanel and AttacksListPanel.
 */
export const SummaryViewContent: React.FC<SummaryViewContentProps> = React.memo(
  ({ filters, query, dataView }) => {
    return (
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
    );
  }
);
SummaryViewContent.displayName = 'SummaryViewContent';
