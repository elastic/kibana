/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiSpacer, EuiWindowEvent } from '@elastic/eui';
import styled from '@emotion/styled';
import { noop } from 'lodash/fp';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isTab } from '@kbn/timelines-plugin/public';
import type { Filter } from '@kbn/es-query';
import { dataTableSelectors, tableDefaults, TableId } from '@kbn/securitysolution-data-table';
import type { FilterGroupHandler } from '@kbn/alerts-ui-shared';
import type { DataView } from '@kbn/data-views-plugin/common';
import { PAGE_TITLE } from '../../pages/alerts/translations';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { HeaderPage } from '../../../common/components/header_page';
import { KPIsSection } from './kpis/kpis_section';
import { FiltersSection } from './filters/filters_section';
import { HeaderSection } from './header/header_section';
import { SearchBarSection } from './search_bar/search_bar_section';
import { TableSection } from './table/table_section';
import type { AssigneesIdsSelection } from '../../../common/components/assignees/types';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { useGlobalFullScreen } from '../../../common/containers/use_full_screen';
import { Display } from '../../../explore/hosts/pages/display';
import {
  focusUtilityBarAction,
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
} from '../../../timelines/components/timeline/helpers';
import type { Status } from '../../../../common/api/detection_engine';

export const CONTENT_TEST_ID = 'alerts-page-content';
export const SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID = 'alerts-page-security-solution-page-wrapper';

/**
 * Need a 100% height here to account for the graph/analyze tool, which sets no explicit height parameters, but fills the available space.
 */
const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

export interface AlertsPageContentProps {
  /**
   * DataView for the alerts page
   */
  dataView: DataView;
}

/**
 * Renders the content of the alerts page: search bar, header, filters, KPIs, and table sections.
 */
export const AlertsPageContent = memo(({ dataView }: AlertsPageContentProps) => {
  const containerElement = useRef<HTMLDivElement | null>(null);

  const { globalFullScreen } = useGlobalFullScreen();

  const [assignees, setAssignees] = useState<AssigneesIdsSelection[]>([]);
  const [statusFilter, setStatusFilter] = useState<Status[]>([]);
  const [pageFilters, setPageFilters] = useState<Filter[]>();
  const [pageFilterHandler, setPageFilterHandler] = useState<FilterGroupHandler | undefined>();

  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);
  const isTableLoading = useShallowEqualSelector(
    (state) => (getTable(state, TableId.alertsOnAlertsPage) ?? tableDefaults).isLoading
  );

  const onSkipFocusBeforeEventsTable = useCallback(() => {
    focusUtilityBarAction(containerElement.current);
  }, [containerElement]);

  const onSkipFocusAfterEventsTable = useCallback(() => {
    resetKeyboardFocus();
  }, []);

  const onKeyDown = useCallback(
    (keyboardEvent: React.KeyboardEvent) => {
      if (isTab(keyboardEvent)) {
        onTimelineTabKeyPressed({
          containerElement: containerElement.current,
          keyboardEvent,
          onSkipFocusBeforeEventsTable,
          onSkipFocusAfterEventsTable,
        });
      }
    },
    [containerElement, onSkipFocusBeforeEventsTable, onSkipFocusAfterEventsTable]
  );

  useEffect(() => {
    if (!pageFilterHandler) return;
    // if Alert is reloaded because of action by the user.
    // We want reload the values in the detection Page filters
    if (!isTableLoading) pageFilterHandler.reload();
  }, [isTableLoading, pageFilterHandler]);

  return (
    <StyledFullHeightContainer
      data-test-subj={CONTENT_TEST_ID}
      onKeyDown={onKeyDown}
      ref={containerElement}
    >
      <EuiWindowEvent event="resize" handler={noop} />
      <SearchBarSection dataView={dataView} />
      <SecuritySolutionPageWrapper
        noPadding={globalFullScreen}
        data-test-subj={SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID}
      >
        <Display show={!globalFullScreen}>
          <HeaderPage title={PAGE_TITLE}>
            <HeaderSection assignees={assignees} setAssignees={setAssignees} />
          </HeaderPage>
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="l" />
          <FiltersSection
            assignees={assignees}
            dataView={dataView}
            pageFilters={pageFilters}
            setStatusFilter={setStatusFilter}
            setPageFilters={setPageFilters}
            setPageFilterHandler={setPageFilterHandler}
          />
          <EuiSpacer size="l" />
          <KPIsSection assignees={assignees} pageFilters={pageFilters} dataView={dataView} />
          <EuiSpacer size="l" />
        </Display>
        <TableSection
          assignees={assignees}
          dataView={dataView}
          pageFilters={pageFilters}
          statusFilter={statusFilter}
        />
      </SecuritySolutionPageWrapper>
    </StyledFullHeightContainer>
  );
});

AlertsPageContent.displayName = 'AlertsPageContent';
