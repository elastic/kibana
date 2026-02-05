/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { capitalize } from 'lodash';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiEmptyPrompt,
  EuiHealth,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { ALERT_RULE_NAME, ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { SECURITY_CELL_ACTIONS_ALERTS_COUNT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { PageScope } from '../../../../data_view_manager/constants';
import { useNavigateToAlertsPageWithFilters } from '../../../../common/hooks/use_navigate_to_alerts_page_with_filters';
import { HeaderSection } from '../../../../common/components/header_section';

import * as i18n from '../translations';
import type { RuleAlertsItem } from './use_rule_alerts_items';
import { useRuleAlertsItems } from './use_rule_alerts_items';
import type { GetAppUrl, NavigateTo } from '../../../../common/lib/kibana';
import { useNavigation } from '../../../../common/lib/kibana';
import { SecurityPageName } from '../../../../../common/constants';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { HoverVisibilityContainer } from '../../../../common/components/hover_visibility_container';
import { BUTTON_CLASS as INSPECT_BUTTON_CLASS } from '../../../../common/components/inspect';
import { LastUpdatedAt } from '../../../../common/components/last_updated_at';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { CellActionsMode, SecurityCellActions } from '../../../../common/components/cell_actions';
import { useGlobalFilterQuery } from '../../../../common/hooks/use_global_filter_query';
import { useRiskSeverityColors } from '../../../../common/utils/risk_color_palette';

export interface RuleAlertsTableProps {
  signalIndexName: string | null;
}

export type GetTableColumns = (params: {
  getAppUrl: GetAppUrl;
  navigateTo: NavigateTo;
  openRuleInAlertsPage: (ruleName: string) => void;
}) => Array<EuiBasicTableColumn<RuleAlertsItem>>;

const DETECTION_RESPONSE_RULE_ALERTS_QUERY_ID =
  'detection-response-rule-alerts-severity-table' as const;

export const useGetTableColumns: GetTableColumns = ({
  getAppUrl,
  navigateTo,
  openRuleInAlertsPage,
}) => {
  const severityColors = useRiskSeverityColors();
  return useMemo(
    () => [
      {
        field: 'name',
        name: i18n.RULE_ALERTS_COLUMN_RULE_NAME,
        render: (name: string, { id }) => {
          const url = getAppUrl({ deepLinkId: SecurityPageName.rules, path: `id/${id}` });
          return (
            <EuiToolTip
              data-test-subj={`${id}-tooltip`}
              title={i18n.OPEN_RULE_DETAIL_TOOLTIP}
              content={name}
              anchorClassName="eui-textTruncate"
            >
              {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
              <EuiLink
                data-test-subj="severityRuleAlertsTable-name"
                href={url}
                onClick={(ev?: React.MouseEvent) => {
                  if (ev) {
                    ev.preventDefault();
                  }
                  navigateTo({ url });
                }}
              >
                {name}
              </EuiLink>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'last_alert_at',
        name: i18n.RULE_ALERTS_COLUMN_LAST_ALERT,
        'data-test-subj': 'severityRuleAlertsTable-lastAlertAt',
        render: (lastAlertAt: string) => <FormattedRelative value={new Date(lastAlertAt)} />,
      },
      {
        field: 'alert_count',
        name: i18n.RULE_ALERTS_COLUMN_ALERT_COUNT,
        'data-test-subj': 'severityRuleAlertsTable-alertCount',
        render: (alertCount: number, { name }) => (
          <SecurityCellActions
            data={{
              value: name,
              field: ALERT_RULE_NAME,
            }}
            mode={CellActionsMode.HOVER_RIGHT}
            triggerId={SECURITY_CELL_ACTIONS_ALERTS_COUNT}
            sourcererScopeId={PageScope.alerts}
            metadata={{
              andFilters: [{ field: 'kibana.alert.workflow_status', value: 'open' }],
            }}
          >
            <EuiLink
              data-test-subj="severityRuleAlertsTable-alertCountLink"
              disabled={alertCount === 0}
              onClick={() => openRuleInAlertsPage(name)}
            >
              <FormattedCount count={alertCount} />
            </EuiLink>
          </SecurityCellActions>
        ),
      },
      {
        field: 'severity',
        name: i18n.RULE_ALERTS_COLUMN_SEVERITY,
        'data-test-subj': 'severityRuleAlertsTable-severity',
        render: (severity: Severity) => (
          <EuiHealth color={severityColors[severity]}>{capitalize(severity)}</EuiHealth>
        ),
      },
    ],
    [getAppUrl, navigateTo, openRuleInAlertsPage, severityColors]
  );
};

export const RuleAlertsTable = React.memo<RuleAlertsTableProps>(({ signalIndexName }) => {
  const { getAppUrl, navigateTo } = useNavigation();
  const { toggleStatus, setToggleStatus } = useQueryToggle(DETECTION_RESPONSE_RULE_ALERTS_QUERY_ID);
  const { filterQuery } = useGlobalFilterQuery();

  const { items, isLoading, updatedAt } = useRuleAlertsItems({
    signalIndexName,
    queryId: DETECTION_RESPONSE_RULE_ALERTS_QUERY_ID,
    skip: !toggleStatus,
    filterQuery,
  });

  const openAlertsPageWithFilter = useNavigateToAlertsPageWithFilters();

  const openRuleInAlertsPage = useCallback(
    (ruleName: string) =>
      openAlertsPageWithFilter({
        title: i18n.OPEN_IN_ALERTS_TITLE_RULENAME,
        selectedOptions: [ruleName],
        fieldName: ALERT_RULE_NAME,
      }),
    [openAlertsPageWithFilter]
  );

  const navigateToAlerts = useCallback(() => {
    openAlertsPageWithFilter({
      title: i18n.OPEN_IN_ALERTS_TITLE_STATUS,
      selectedOptions: ['open'],
      fieldName: ALERT_WORKFLOW_STATUS,
    });
  }, [openAlertsPageWithFilter]);

  const columns = useGetTableColumns({ getAppUrl, navigateTo, openRuleInAlertsPage });

  return (
    <HoverVisibilityContainer show={true} targetClassNames={[INSPECT_BUTTON_CLASS]}>
      <EuiPanel hasBorder data-test-subj="severityRuleAlertsPanel">
        <HeaderSection
          id={DETECTION_RESPONSE_RULE_ALERTS_QUERY_ID}
          title={i18n.RULE_ALERTS_SECTION_TITLE}
          titleSize="s"
          toggleStatus={toggleStatus}
          toggleQuery={setToggleStatus}
          subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
        />
        {toggleStatus && (
          <>
            <EuiBasicTable
              data-test-subj="severityRuleAlertsTable"
              columns={columns}
              items={items}
              loading={isLoading}
              noItemsMessage={
                <EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />
              }
              tableCaption={i18n.RULE_ALERTS_SECTION_TITLE}
            />
            <EuiSpacer size="m" />
            <EuiButton data-test-subj="severityRuleAlertsButton" onClick={navigateToAlerts}>
              {i18n.OPEN_ALL_ALERTS_BUTTON}
            </EuiButton>
          </>
        )}
      </EuiPanel>
    </HoverVisibilityContainer>
  );
});
RuleAlertsTable.displayName = 'RuleAlertsTable';
