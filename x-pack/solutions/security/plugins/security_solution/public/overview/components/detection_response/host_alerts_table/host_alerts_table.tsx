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
import { BUTTON_CLASS as INPECT_BUTTON_CLASS } from '../../../../common/components/inspect';
import { LastUpdatedAt } from '../../../../common/components/last_updated_at';
import { HostDetailsLink } from '../../../../common/components/links';
import { useQueryToggle } from '../../../../common/containers/query_toggle';

import * as i18n from '../translations';
import { ITEMS_PER_PAGE } from '../utils';
import type { HostAlertsItem } from './use_host_alerts_items';
import { useHostAlertsItems } from './use_host_alerts_items';
import { CellActionsMode, SecurityCellActions } from '../../../../common/components/cell_actions';
import { useGlobalFilterQuery } from '../../../../common/hooks/use_global_filter_query';
import { useRiskSeverityColors } from '../../../../common/utils/risk_color_palette';

interface HostAlertsTableProps {
  signalIndexName: string | null;
}

type GetTableColumns = (
  handleClick: (params: { hostName: string; severity?: string }) => void
) => Array<EuiBasicTableColumn<HostAlertsItem>>;

const DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID = 'vulnerableHostsBySeverityQuery';

export const HostAlertsTable = React.memo(({ signalIndexName }: HostAlertsTableProps) => {
  const openAlertsPageWithFilters = useNavigateToAlertsPageWithFilters();
  const { filterQuery } = useGlobalFilterQuery();

  const openHostInAlerts = useCallback(
    ({ hostName, severity }: { hostName: string; severity?: string }) =>
      openAlertsPageWithFilters([
        {
          title: i18n.OPEN_IN_ALERTS_TITLE_HOSTNAME,
          selectedOptions: [hostName],
          fieldName: 'host.name',
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
    DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID
  );
  const { items, isLoading, updatedAt, pagination } = useHostAlertsItems({
    skip: !toggleStatus,
    queryId: DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID,
    signalIndexName,
    filterQuery,
  });

  const columns = useGetTableColumns(openHostInAlerts);

  return (
    <HoverVisibilityContainer show={true} targetClassNames={[INPECT_BUTTON_CLASS]}>
      <EuiPanel hasBorder data-test-subj="severityHostAlertsPanel">
        <HeaderSection
          id={DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID}
          title={i18n.HOST_ALERTS_SECTION_TITLE}
          subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
          titleSize="s"
          toggleQuery={setToggleStatus}
          toggleStatus={toggleStatus}
          tooltip={i18n.HOST_TOOLTIP}
        />
        {toggleStatus && (
          <>
            <EuiBasicTable
              items={items}
              columns={columns}
              loading={isLoading}
              data-test-subj="severityHostAlertsTable"
              tableCaption={i18n.HOST_ALERTS_SECTION_TITLE}
              noItemsMessage={
                <EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />
              }
            />
            <EuiSpacer size="m" />
            {pagination.pageCount > 1 && (
              <EuiTablePagination
                data-test-subj="hostTablePaginator"
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

HostAlertsTable.displayName = 'HostAlertsTable';

const useGetTableColumns: GetTableColumns = (handleClick) => {
  const severityColors = useRiskSeverityColors();
  return useMemo(
    () => [
      {
        field: 'hostName',
        name: i18n.HOST_ALERTS_HOSTNAME_COLUMN,
        'data-test-subj': 'hostSeverityAlertsTable-hostName',
        render: (hostName: string) => (
          <EuiToolTip
            title={i18n.OPEN_HOST_DETAIL_TOOLTIP}
            content={hostName}
            anchorClassName="eui-textTruncate"
          >
            <HostDetailsLink hostName={hostName} />
          </EuiToolTip>
        ),
      },
      {
        field: 'totalAlerts',
        name: i18n.ALERTS_TEXT,
        'data-test-subj': 'hostSeverityAlertsTable-totalAlerts',
        render: (totalAlerts: number, { hostName }) => (
          <SecurityCellActions
            data={{
              value: hostName,
              field: 'host.name',
            }}
            mode={CellActionsMode.HOVER_RIGHT}
            triggerId={SECURITY_CELL_ACTIONS_ALERTS_COUNT}
            sourcererScopeId={PageScope.alerts}
            metadata={{
              andFilters: [{ field: 'kibana.alert.workflow_status', value: 'open' }],
            }}
          >
            <EuiLink
              data-test-subj="hostSeverityAlertsTable-totalAlertsLink"
              disabled={totalAlerts === 0}
              onClick={() => handleClick({ hostName })}
            >
              <FormattedCount count={totalAlerts} />
            </EuiLink>
          </SecurityCellActions>
        ),
      },
      {
        field: 'critical',
        name: i18n.STATUS_CRITICAL_LABEL,
        render: (count: number, { hostName }) => (
          <EuiHealth
            data-test-subj="hostSeverityAlertsTable-critical"
            color={severityColors.critical}
          >
            {count > 0 ? (
              <SecurityCellActions
                data={{
                  value: hostName,
                  field: 'host.name',
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
                  data-test-subj="hostSeverityAlertsTable-criticalLink"
                  onClick={() => handleClick({ hostName, severity: 'critical' })}
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
        render: (count: number, { hostName }) => (
          <EuiHealth data-test-subj="hostSeverityAlertsTable-high" color={severityColors.high}>
            {count > 0 ? (
              <SecurityCellActions
                data={{
                  value: hostName,
                  field: 'host.name',
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
                <EuiLink onClick={() => handleClick({ hostName, severity: 'high' })}>
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
        render: (count: number, { hostName }) => (
          <EuiHealth data-test-subj="hostSeverityAlertsTable-medium" color={severityColors.medium}>
            {count > 0 ? (
              <SecurityCellActions
                data={{
                  value: hostName,
                  field: 'host.name',
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
                <EuiLink onClick={() => handleClick({ hostName, severity: 'medium' })}>
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
        render: (count: number, { hostName }) => (
          <EuiHealth data-test-subj="hostSeverityAlertsTable-low" color={severityColors.low}>
            {count > 0 ? (
              <SecurityCellActions
                data={{
                  value: hostName,
                  field: 'host.name',
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
                <EuiLink onClick={() => handleClick({ hostName, severity: 'low' })}>
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
    [
      handleClick,
      severityColors.critical,
      severityColors.high,
      severityColors.low,
      severityColors.medium,
    ]
  );
};
