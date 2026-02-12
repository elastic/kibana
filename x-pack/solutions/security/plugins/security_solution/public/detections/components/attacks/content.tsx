/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiWindowEvent,
} from '@elastic/eui';
import styled from '@emotion/styled';
import { noop } from 'lodash/fp';
import type { DataView } from '@kbn/data-views-plugin/common';

import { isEqual } from 'lodash';
import { useAssistantContext, useLoadConnectors } from '@kbn/elastic-assistant';
import type { Filter } from '@kbn/es-query';
import type { FilterGroupHandler } from '@kbn/alerts-ui-shared';
import { dataTableSelectors, tableDefaults, TableId } from '@kbn/securitysolution-data-table';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useKibana } from '../../../common/lib/kibana';
import { useFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { Schedule } from '../../../attack_discovery/pages/header/schedule';
import { FilterByAssigneesPopover } from '../../../common/components/filter_by_assignees_popover/filter_by_assignees_popover';
import { PAGE_TITLE } from '../../pages/attacks/translations';
import { HeaderPage } from '../../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { useGlobalFullScreen } from '../../../common/containers/use_full_screen';
import { Display } from '../../../explore/hosts/pages/display';
import { SearchBarSection } from './search_bar/search_bar_section';
import { SchedulesFlyout } from './schedule_flyout';
import { TableSection } from './table/table_section';
import type { AssigneesIdsSelection } from '../../../common/components/assignees/types';
import { ConnectorFilter } from '../../../attack_discovery/pages/results/history/search_and_filter/connector_filter';

import type { Status } from '../../../../common/api/detection_engine';
import { FiltersSection } from './filters/filters_section';
import { KPIsSection } from './kpis/kpis_section';

export const CONTENT_TEST_ID = 'attacks-page-content';
export const SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID = 'attacks-page-security-solution-page-wrapper';

/**
 * Need a 100% height here to account for the graph/analyze tool, which sets no explicit height parameters, but fills the available space.
 */
const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

export interface AttacksPageContentProps {
  /**
   * DataView for the attacks page
   */
  dataView: DataView;
}

/**
 * Renders the content of the attacks page: search bar, header, filters, KPIs, and table sections.
 */
export const AttacksPageContent = React.memo(({ dataView }: AttacksPageContentProps) => {
  const containerElement = useRef<HTMLDivElement | null>(null);

  const { globalFullScreen } = useGlobalFullScreen();
  const [selectedConnectorNames, setSelectedConnectorNames] = useState<string[]>([]);
  const {
    services: { settings },
  } = useKibana();

  const { http, inferenceEnabled } = useAssistantContext();
  const { data: aiConnectors } = useLoadConnectors({
    http,
    inferenceEnabled,
    settings,
  });
  const { from } = useGlobalTime();
  const { data } = useFindAttackDiscoveries({
    http,
    isAssistantEnabled: true,
    start: from,
    scheduled: true,
  });
  const aiConnectorNames = useMemo(() => data?.connector_names ?? [], [data]);

  // showing / hiding the schedules flyout:
  const [showSchedulesFlyout, setShowSchedulesFlyout] = useState<boolean>(false);
  const openSchedulesFlyout = useCallback(() => {
    setShowSchedulesFlyout(true);
  }, []);
  const onCloseSchedulesFlyout = useCallback(() => setShowSchedulesFlyout(false), []);
  const [assignees, setAssignees] = useState<AssigneesIdsSelection[]>([]);

  const onAssigneesSelectionChange = useCallback(
    (newAssignees: AssigneesIdsSelection[]) => {
      if (!isEqual(newAssignees, assignees)) {
        setAssignees(newAssignees);
      }
    },
    [assignees]
  );
  const [statusFilter, setStatusFilter] = useState<Status[]>([]);
  const [pageFilters, setPageFilters] = useState<Filter[]>();
  const [pageFilterHandler, setPageFilterHandler] = useState<FilterGroupHandler | undefined>();

  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);
  const isTableLoading = useShallowEqualSelector(
    (state) => (getTable(state, TableId.alertsOnAlertsPage) ?? tableDefaults).isLoading
  );

  useEffect(() => {
    if (!pageFilterHandler) return;
    // if the table is reloaded because of action by the user
    // (e.g. closed and alert)
    // We want reload the values in the Attacks Page filters
    if (!isTableLoading) pageFilterHandler.reload();
  }, [isTableLoading, pageFilterHandler]);

  return (
    <StyledFullHeightContainer data-test-subj={CONTENT_TEST_ID} ref={containerElement}>
      <EuiWindowEvent event="resize" handler={noop} />
      <SearchBarSection dataView={dataView} />
      <SecuritySolutionPageWrapper
        noPadding={globalFullScreen}
        data-test-subj={SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID}
      >
        <Display show={!globalFullScreen}>
          <HeaderPage title={PAGE_TITLE}>
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem>
                <FilterByAssigneesPopover
                  selectedUserIds={assignees}
                  onSelectionChange={onAssigneesSelectionChange}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <ConnectorFilter
                  aiConnectors={aiConnectors}
                  connectorNames={aiConnectorNames}
                  selectedConnectorNames={selectedConnectorNames}
                  setSelectedConnectorNames={setSelectedConnectorNames}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <Schedule openFlyout={openSchedulesFlyout} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </HeaderPage>
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="l" />
          <FiltersSection
            dataView={dataView}
            pageFilters={pageFilters}
            setStatusFilter={setStatusFilter}
            setPageFilters={setPageFilters}
            setPageFilterHandler={setPageFilterHandler}
          />
          <EuiSpacer size="l" />
        </Display>

        <EuiSpacer />
        <KPIsSection
          pageFilters={pageFilters}
          assignees={assignees}
          selectedConnectorNames={selectedConnectorNames}
          dataView={dataView}
        />

        <EuiSpacer />
        <TableSection
          dataView={dataView}
          statusFilter={statusFilter}
          pageFilters={pageFilters}
          assignees={assignees}
          selectedConnectorNames={selectedConnectorNames}
          openSchedulesFlyout={openSchedulesFlyout}
        />

        {showSchedulesFlyout && <SchedulesFlyout onClose={onCloseSchedulesFlyout} />}
      </SecuritySolutionPageWrapper>
    </StyledFullHeightContainer>
  );
});
AttacksPageContent.displayName = 'AttacksPageContent';
