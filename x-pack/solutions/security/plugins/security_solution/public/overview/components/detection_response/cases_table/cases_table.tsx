/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiEmptyPrompt,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { CaseStatuses } from '@kbn/cases-components';

import { SecurityPageName } from '../../../../app/types';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { HeaderSection } from '../../../../common/components/header_section';
import { HoverVisibilityContainer } from '../../../../common/components/hover_visibility_container';
import { BUTTON_CLASS as INPECT_BUTTON_CLASS } from '../../../../common/components/inspect';
import { LastUpdatedAt } from '../../../../common/components/last_updated_at';
import { CaseDetailsLink } from '../../../../common/components/links';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import type { NavigateTo, GetAppUrl } from '../../../../common/lib/kibana';
import { useNavigation } from '../../../../common/lib/kibana';
import * as i18n from '../translations';
import { StatusBadge } from './status_badge';
import type { CaseItem } from './use_case_items';
import { useCaseItems } from './use_case_items';

type GetTableColumns = (params: {
  getAppUrl: GetAppUrl;
  navigateTo: NavigateTo;
}) => Array<EuiBasicTableColumn<CaseItem>>;

const DETECTION_RESPONSE_RECENT_CASES_QUERY_ID = 'recentlyCreatedCasesQuery';

export const CasesTable = React.memo(() => {
  const { getAppUrl, navigateTo } = useNavigation();
  const { toggleStatus, setToggleStatus } = useQueryToggle(
    DETECTION_RESPONSE_RECENT_CASES_QUERY_ID
  );
  const { items, isLoading, updatedAt } = useCaseItems({
    skip: !toggleStatus,
  });

  const navigateToCases = useCallback(() => {
    navigateTo({ deepLinkId: SecurityPageName.case });
  }, [navigateTo]);

  const columns = useMemo(
    () => getTableColumns({ getAppUrl, navigateTo }),
    [getAppUrl, navigateTo]
  );

  return (
    <HoverVisibilityContainer show={true} targetClassNames={[INPECT_BUTTON_CLASS]}>
      <EuiPanel hasBorder data-test-subj="recentlyCreatedCasesPanel">
        <HeaderSection
          id={DETECTION_RESPONSE_RECENT_CASES_QUERY_ID}
          title={i18n.CASES_TABLE_SECTION_TITLE}
          titleSize="s"
          toggleStatus={toggleStatus}
          toggleQuery={setToggleStatus}
          subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
          showInspectButton={false}
          tooltip={i18n.CASES_TABLE_SECTION_TOOLTIP}
        />

        {toggleStatus && (
          <>
            <EuiBasicTable
              data-test-subj="recentlyCreatedCasesTable"
              columns={columns}
              items={items}
              loading={isLoading}
              noItemsMessage={
                <EuiEmptyPrompt title={<h3>{i18n.NO_CASES_FOUND}</h3>} titleSize="xs" />
              }
            />
            <EuiSpacer size="m" />
            <EuiButton data-test-subj="allCasesButton" onClick={navigateToCases}>
              {i18n.VIEW_ALL_CASES}
            </EuiButton>
          </>
        )}
      </EuiPanel>
    </HoverVisibilityContainer>
  );
});

CasesTable.displayName = 'CasesTable';

const getTableColumns: GetTableColumns = () => [
  {
    field: 'id',
    name: i18n.CASES_TABLE_COLUMN_NAME,
    'data-test-subj': 'recentlyCreatedCaseName',
    render: (id: string, { name }) => (
      <EuiToolTip
        title={i18n.OPEN_CASE_DETAIL_TOOLTIP}
        content={name}
        anchorClassName="eui-textTruncate"
      >
        <CaseDetailsLink detailName={id}>{name}</CaseDetailsLink>
      </EuiToolTip>
    ),
  },
  {
    field: 'totalAlerts',
    name: i18n.ALERTS_TEXT,
    truncateText: true,
    textOnly: true,
    'data-test-subj': 'recentlyCreatedCaseAlert',
    render: (totalAlerts: number) => <FormattedCount count={totalAlerts} />,
  },
  {
    field: 'createdAt',
    name: i18n.CASES_TABLE_COLUMN_TIME,
    render: (createdAt: string) => (
      <FormattedDate
        fieldName={i18n.CASES_TABLE_COLUMN_TIME}
        value={createdAt}
        className="eui-textTruncate"
        dateFormat="MMMM D, YYYY"
      />
    ),
    'data-test-subj': 'recentlyCreatedCaseTime',
  },
  {
    field: 'createdBy',
    name: i18n.CASES_TABLE_COLUMN_CREATED_BY,
    render: (createdBy: string) => (
      <EuiText data-test-subj="recentlyCreatedCaseCreatedBy" size="s">
        {createdBy}
      </EuiText>
    ),
  },
  {
    field: 'status',
    name: i18n.CASES_TABLE_COLUMN_STATUS,
    render: (status: CaseStatuses) => <StatusBadge status={status} />,
    'data-test-subj': 'recentlyCreatedCaseStatus',
  },
];
