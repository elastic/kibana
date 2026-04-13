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
  useEuiTheme,
} from '@elastic/eui';
import styled from '@emotion/styled';
import { noop } from 'lodash/fp';
import type { DataView } from '@kbn/data-views-plugin/common';

import { isEqual } from 'lodash';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { useLoadConnectors } from '@kbn/inference-connectors';
import type { Filter } from '@kbn/es-query';
import type { FilterGroupHandler } from '@kbn/alerts-ui-shared';
import { dataTableSelectors, tableDefaults, TableId } from '@kbn/securitysolution-data-table';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useKibana } from '../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../common/lib/telemetry';
import { useFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { Schedule } from '../../../attack_discovery/pages/header/schedule';
import { FilterByAssigneesPopover } from '../../../common/components/filter_by_assignees_popover/filter_by_assignees_popover';
import { PAGE_TITLE } from '../../pages/attacks/translations';
import { HeaderPage } from '../../../common/components/header_page';
import { IconSparkles } from '../../../common/icons/sparkles';
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
const FILTERS_SECTION_WIDTH = 480;

/**
 * Need a 100% height here to account for the graph/analyze tool, which sets no explicit height parameters, but fills the available space.
 */
const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

const VerticalDivider = styled(EuiFlexItem)`
  align-self: stretch;
  border-left: ${({ theme: { euiTheme } }) => euiTheme.border.thin};
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
    services: { settings, telemetry },
  } = useKibana();
  const { euiTheme } = useEuiTheme();

  const { http } = useAssistantContext();
  const { data: aiConnectors } = useLoadConnectors({
    http,
    featureId: 'attack_discovery',
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
    telemetry.reportEvent(AttacksEventTypes.ScheduleFlyoutOpened, {
      source: 'attacks_page_header',
    });
  }, [telemetry]);
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
          <HeaderPage
            title={
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
                <EuiFlexItem grow={false}>{PAGE_TITLE}</EuiFlexItem>
                <EuiSpacer size="m" />
                <EuiFlexItem
                  grow={false}
                  style={{ marginLeft: euiTheme.size.s, marginTop: euiTheme.size.s }}
                >
                  <IconSparkles />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem>
                <Schedule openFlyout={openSchedulesFlyout} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </HeaderPage>
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="l" />
          <EuiFlexGroup direction="row" responsive={false} wrap={true}>
            <EuiFlexItem grow={1} style={{ maxWidth: FILTERS_SECTION_WIDTH }}>
              <EuiFlexGroup direction="row" responsive={false}>
                <EuiFlexItem grow={1}>
                  <FilterByAssigneesPopover
                    selectedUserIds={assignees}
                    onSelectionChange={onAssigneesSelectionChange}
                    compressed={true}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={1}>
                  <ConnectorFilter
                    aiConnectors={aiConnectors}
                    connectorNames={aiConnectorNames}
                    selectedConnectorNames={selectedConnectorNames}
                    setSelectedConnectorNames={setSelectedConnectorNames}
                    compressed={true}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <VerticalDivider grow={false} aria-hidden={true} />
            <EuiFlexItem grow={1} style={{ minWidth: FILTERS_SECTION_WIDTH }}>
              <FiltersSection
                dataView={dataView}
                pageFilters={pageFilters}
                setStatusFilter={setStatusFilter}
                setPageFilters={setPageFilters}
                setPageFilterHandler={setPageFilterHandler}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
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
