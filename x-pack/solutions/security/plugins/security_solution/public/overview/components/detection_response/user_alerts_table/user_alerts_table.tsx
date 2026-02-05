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
  EuiEmptyPrompt,
  EuiHealth,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTablePagination,
  EuiToolTip,
} from '@elastic/eui';

import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import { SECURITY_CELL_ACTIONS_ALERTS_COUNT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { PageScope } from '../../../../data_view_manager/constants';
import { useNavigateToAlertsPageWithFilters } from '../../../../common/hooks/use_navigate_to_alerts_page_with_filters';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { HeaderSection } from '../../../../common/components/header_section';
import { HoverVisibilityContainer } from '../../../../common/components/hover_visibility_container';
import { BUTTON_CLASS as INSPECT_BUTTON_CLASS } from '../../../../common/components/inspect';
import { LastUpdatedAt } from '../../../../common/components/last_updated_at';
import { UserDetailsLink } from '../../../../common/components/links';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import * as i18n from '../translations';
import { ITEMS_PER_PAGE } from '../utils';
import type { UserAlertsItem } from './use_user_alerts_items';
import { useUserAlertsItems } from './use_user_alerts_items';
import { CellActionsMode, SecurityCellActions } from '../../../../common/components/cell_actions';
import { useGlobalFilterQuery } from '../../../../common/hooks/use_global_filter_query';
import { useRiskSeverityColors } from '../../../../common/utils/risk_color_palette';

interface UserAlertsTableProps {
  signalIndexName: string | null;
}

type GetTableColumns = (
  handleClick: (params: { userName: string; severity?: string }) => void
) => Array<EuiBasicTableColumn<UserAlertsItem>>;

const DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID = 'vulnerableUsersBySeverityQuery';

export const UserAlertsTable = React.memo(({ signalIndexName }: UserAlertsTableProps) => {
  const openAlertsPageWithFilters = useNavigateToAlertsPageWithFilters();
  const { filterQuery } = useGlobalFilterQuery();

  const openUserInAlerts = useCallback(
    ({ userName, severity }: { userName: string; severity?: string }) =>
      openAlertsPageWithFilters([
        {
          title: i18n.OPEN_IN_ALERTS_TITLE_USERNAME,
          selectedOptions: [userName],
          fieldName: 'user.name',
        },

        ...(severity
          ? [
              {
                title: i18n.OPEN_IN_ALERTS_TITLE_SEVERITY,
                selectedOptions: [severity],
                fieldName: ALERT_SEVERITY,
              },
            ]
          : []),
      ]),
    [openAlertsPageWithFilters]
  );

  const { toggleStatus, setToggleStatus } = useQueryToggle(
    DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID
  );
  const { items, isLoading, updatedAt, pagination } = useUserAlertsItems({
    skip: !toggleStatus,
    queryId: DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID,
    signalIndexName,
    filterQuery,
  });
  const columns = useGetTableColumns(openUserInAlerts);

  return (
    <HoverVisibilityContainer show={true} targetClassNames={[INSPECT_BUTTON_CLASS]}>
      <EuiPanel hasBorder data-test-subj="severityUserAlertsPanel">
        <HeaderSection
          id={DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID}
          title={i18n.USER_ALERTS_SECTION_TITLE}
          titleSize="s"
          toggleStatus={toggleStatus}
          toggleQuery={setToggleStatus}
          subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
          tooltip={i18n.USER_TOOLTIP}
        />
        {toggleStatus && (
          <>
            <EuiBasicTable
              data-test-subj="severityUserAlertsTable"
              columns={columns}
              items={items}
              loading={isLoading}
              tableCaption={i18n.USER_ALERTS_SECTION_TITLE}
              noItemsMessage={
                <EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />
              }
            />
            <EuiSpacer size="m" />
            {pagination.pageCount > 1 && (
              <EuiTablePagination
                data-test-subj="userTablePaginator"
                activePage={pagination.currentPage}
                itemsPerPage={ITEMS_PER_PAGE}
                pageCount={pagination.pageCount}
                onChangePage={pagination.setPage}
                showPerPageOptions={false}
              />
            )}
          </>
        )}
      </EuiPanel>
    </HoverVisibilityContainer>
  );
});

UserAlertsTable.displayName = 'UserAlertsTable';

const useGetTableColumns: GetTableColumns = (handleClick) => {
  const severityColors = useRiskSeverityColors();
  return useMemo(
    () => [
      {
        field: 'userName',
        name: i18n.USER_ALERTS_USERNAME_COLUMN,
        'data-test-subj': 'userSeverityAlertsTable-userName',
        render: (userName: string) => (
          <EuiToolTip
            title={i18n.OPEN_USER_DETAIL_TOOLTIP}
            content={userName}
            anchorClassName="eui-textTruncate"
          >
            <UserDetailsLink userName={userName} />
          </EuiToolTip>
        ),
      },
      {
        field: 'totalAlerts',
        name: i18n.ALERTS_TEXT,
        'data-test-subj': 'userSeverityAlertsTable-totalAlerts',
        render: (totalAlerts: number, { userName }) => (
          <SecurityCellActions
            data={{
              value: userName,
              field: 'user.name',
            }}
            mode={CellActionsMode.HOVER_RIGHT}
            triggerId={SECURITY_CELL_ACTIONS_ALERTS_COUNT}
            sourcererScopeId={PageScope.alerts}
            metadata={{
              andFilters: [{ field: 'kibana.alert.workflow_status', value: 'open' }],
            }}
          >
            <EuiLink
              data-test-subj="userSeverityAlertsTable-totalAlertsLink"
              disabled={totalAlerts === 0}
              onClick={() => handleClick({ userName })}
            >
              <FormattedCount count={totalAlerts} />
            </EuiLink>
          </SecurityCellActions>
        ),
      },
      {
        field: 'critical',
        name: i18n.STATUS_CRITICAL_LABEL,
        render: (count: number, { userName }) => (
          <EuiHealth
            data-test-subj="userSeverityAlertsTable-critical"
            color={severityColors.critical}
          >
            {count > 0 ? (
              <SecurityCellActions
                data={{
                  value: userName,
                  field: 'user.name',
                }}
                mode={CellActionsMode.HOVER_RIGHT}
                triggerId={SECURITY_CELL_ACTIONS_ALERTS_COUNT}
                sourcererScopeId={PageScope.alerts}
                metadata={{
                  andFilters: [
                    { field: 'kibana.alert.severity', value: 'critical' },
                    { field: 'kibana.alert.workflow_status', value: 'open' },
                  ],
                }}
              >
                <EuiLink
                  data-test-subj="userSeverityAlertsTable-criticalLink"
                  onClick={() => handleClick({ userName, severity: 'critical' })}
                >
                  <FormattedCount count={count} />
                </EuiLink>
              </SecurityCellActions>
            ) : (
              <FormattedCount count={count} />
            )}
          </EuiHealth>
        ),
      },
      {
        field: 'high',
        name: i18n.STATUS_HIGH_LABEL,
        render: (count: number, { userName }) => (
          <EuiHealth data-test-subj="userSeverityAlertsTable-high" color={severityColors.high}>
            {count > 0 ? (
              <SecurityCellActions
                data={{
                  value: userName,
                  field: 'user.name',
                }}
                mode={CellActionsMode.HOVER_RIGHT}
                triggerId={SECURITY_CELL_ACTIONS_ALERTS_COUNT}
                sourcererScopeId={PageScope.alerts}
                metadata={{
                  andFilters: [
                    { field: 'kibana.alert.severity', value: 'high' },
                    { field: 'kibana.alert.workflow_status', value: 'open' },
                  ],
                }}
              >
                <EuiLink onClick={() => handleClick({ userName, severity: 'high' })}>
                  <FormattedCount count={count} />
                </EuiLink>
              </SecurityCellActions>
            ) : (
              <FormattedCount count={count} />
            )}
          </EuiHealth>
        ),
      },
      {
        field: 'medium',
        name: i18n.STATUS_MEDIUM_LABEL,
        render: (count: number, { userName }) => (
          <EuiHealth data-test-subj="userSeverityAlertsTable-medium" color={severityColors.medium}>
            {count > 0 ? (
              <SecurityCellActions
                data={{
                  value: userName,
                  field: 'user.name',
                }}
                mode={CellActionsMode.HOVER_RIGHT}
                triggerId={SECURITY_CELL_ACTIONS_ALERTS_COUNT}
                sourcererScopeId={PageScope.alerts}
                metadata={{
                  andFilters: [
                    { field: 'kibana.alert.severity', value: 'medium' },
                    { field: 'kibana.alert.workflow_status', value: 'open' },
                  ],
                }}
              >
                <EuiLink onClick={() => handleClick({ userName, severity: 'medium' })}>
                  <FormattedCount count={count} />
                </EuiLink>
              </SecurityCellActions>
            ) : (
              <FormattedCount count={count} />
            )}
          </EuiHealth>
        ),
      },
      {
        field: 'low',
        name: i18n.STATUS_LOW_LABEL,
        render: (count: number, { userName }) => (
          <EuiHealth data-test-subj="userSeverityAlertsTable-low" color={severityColors.low}>
            {count > 0 ? (
              <SecurityCellActions
                data={{
                  value: userName,
                  field: 'user.name',
                }}
                mode={CellActionsMode.HOVER_RIGHT}
                triggerId={SECURITY_CELL_ACTIONS_ALERTS_COUNT}
                sourcererScopeId={PageScope.alerts}
                metadata={{
                  andFilters: [
                    { field: 'kibana.alert.severity', value: 'low' },
                    { field: 'kibana.alert.workflow_status', value: 'open' },
                  ],
                }}
              >
                <EuiLink onClick={() => handleClick({ userName, severity: 'low' })}>
                  <FormattedCount count={count} />
                </EuiLink>
              </SecurityCellActions>
            ) : (
              <FormattedCount count={count} />
            )}
          </EuiHealth>
        ),
      },
    ],
    [handleClick, severityColors]
  );
};
