/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import React, { useCallback } from 'react';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Filter, Query } from '@kbn/es-query';
import { KpiPanel } from '../common/components';
import { HeaderSection } from '../../../../common/components/header_section';
import { SeverityLevelPanel } from '../severity_level_panel';
import { AlertsByRulePanel } from '../alerts_by_rule_panel';
import { AlertsProgressBarPanel } from '../alerts_progress_bar_panel';
import type { GroupBySelection } from '../alerts_progress_bar_panel/types';
import type { AddFilterProps } from '../common/types';

const StyledFlexItem = styled(EuiFlexItem)`
  min-width: 355px;
`;

interface Props {
  addFilter: ({ field, value, negate }: AddFilterProps) => void;
  filters: Filter[];
  panelHeight: number;
  query: Query;
  signalIndexName: string | null;
  title: React.ReactNode;
  runtimeMappings?: MappingRuntimeFields;
  isExpanded: boolean;
  setIsExpanded: (status: boolean) => void;
  groupBySelection: GroupBySelection;
  setGroupBySelection: (groupBySelection: GroupBySelection) => void;
}

export const AlertsSummaryChartsPanel: React.FC<Props> = ({
  addFilter,
  filters,
  panelHeight,
  query,
  runtimeMappings,
  signalIndexName,
  title,
  isExpanded,
  setIsExpanded,
  groupBySelection,
  setGroupBySelection,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const toggleQuery = useCallback(
    (status: boolean) => {
      setIsExpanded(status);
    },
    [setIsExpanded]
  );

  return (
    <KpiPanel height={panelHeight} toggleStatus={isExpanded} data-test-subj="alerts-charts-panel">
      <HeaderSection
        alignHeader="flexStart"
        outerDirection="row"
        title={title}
        titleSize="s"
        hideSubtitle
        showInspectButton={false}
        toggleStatus={isExpanded}
        toggleQuery={toggleQuery}
      />
      {isExpanded && (
        <EuiFlexGroup
          data-test-subj="alerts-charts-container"
          className="eui-yScroll"
          wrap
          gutterSize="m"
          css={css`
            @media only screen and (min-width: ${euiTheme.breakpoint.l}) {
            }
          `}
        >
          <StyledFlexItem>
            <SeverityLevelPanel
              filters={filters}
              query={query}
              signalIndexName={signalIndexName}
              runtimeMappings={runtimeMappings}
              skip={!isExpanded}
              addFilter={addFilter}
            />
          </StyledFlexItem>
          <StyledFlexItem>
            <AlertsByRulePanel
              filters={filters}
              query={query}
              signalIndexName={signalIndexName}
              runtimeMappings={runtimeMappings}
              skip={!isExpanded}
            />
          </StyledFlexItem>
          <StyledFlexItem>
            <AlertsProgressBarPanel
              filters={filters}
              query={query}
              signalIndexName={signalIndexName}
              runtimeMappings={runtimeMappings}
              skip={!isExpanded}
              groupBySelection={groupBySelection}
              setGroupBySelection={setGroupBySelection}
              addFilter={addFilter}
            />
          </StyledFlexItem>
        </EuiFlexGroup>
      )}
    </KpiPanel>
  );
};

AlertsSummaryChartsPanel.displayName = 'AlertsSummaryChartsPanel';
