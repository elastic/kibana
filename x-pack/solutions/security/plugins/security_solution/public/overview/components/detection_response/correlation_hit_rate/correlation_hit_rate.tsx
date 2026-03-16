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
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ALERT_RULE_NAME, ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { SECURITY_CELL_ACTIONS_ALERTS_COUNT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { PageScope } from '../../../../data_view_manager/constants';
import { useNavigateToAlertsPageWithFilters } from '../../../../common/hooks/use_navigate_to_alerts_page_with_filters';
import { HeaderSection } from '../../../../common/components/header_section';
import type { CorrelationHitRateItem } from './use_correlation_hit_rate';
import { useCorrelationHitRate } from './use_correlation_hit_rate';
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

const SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.detectionResponse.correlationAlertsSectionTitle',
  { defaultMessage: 'Correlation alerts' }
);

const COLUMN_RULE_NAME = i18n.translate(
  'xpack.securitySolution.detectionResponse.correlationAlertsColumnRuleName',
  { defaultMessage: 'Rule name' }
);

const COLUMN_ALERT_COUNT = i18n.translate(
  'xpack.securitySolution.detectionResponse.correlationAlertsColumnAlertCount',
  { defaultMessage: 'Alerts' }
);

const COLUMN_LAST_SEEN = i18n.translate(
  'xpack.securitySolution.detectionResponse.correlationAlertsColumnLastSeen',
  { defaultMessage: 'Last seen' }
);

const OPEN_RULE_DETAIL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionResponse.correlationAlertsOpenRuleDetailTooltip',
  { defaultMessage: 'Open rule detail' }
);

const NO_ALERTS_FOUND = i18n.translate(
  'xpack.securitySolution.detectionResponse.correlationAlertsNoAlerts',
  { defaultMessage: 'No correlation alerts to display' }
);

const VIEW_ALL_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionResponse.correlationAlertsViewAll',
  { defaultMessage: 'View all correlation alerts' }
);

const OPEN_IN_ALERTS_TITLE_RULENAME = i18n.translate(
  'xpack.securitySolution.detectionResponse.correlationAlertsOpenInAlertsRuleName',
  { defaultMessage: 'Rule name' }
);

const OPEN_IN_ALERTS_TITLE_STATUS = i18n.translate(
  'xpack.securitySolution.detectionResponse.correlationAlertsOpenInAlertsStatus',
  { defaultMessage: 'Status' }
);

export interface CorrelationHitRateProps {
  signalIndexName: string | null;
}

const DETECTION_RESPONSE_CORRELATION_HIT_RATE_QUERY_ID =
  'detection-response-correlation-hit-rate-table' as const;

type GetTableColumns = (params: {
  getAppUrl: GetAppUrl;
  navigateTo: NavigateTo;
  openRuleInAlertsPage: (ruleName: string) => void;
}) => Array<EuiBasicTableColumn<CorrelationHitRateItem>>;

const useGetTableColumns: GetTableColumns = ({ getAppUrl, navigateTo, openRuleInAlertsPage }) =>
  useMemo(
    () => [
      {
        field: 'name',
        name: COLUMN_RULE_NAME,
        render: (name: string, { id }: CorrelationHitRateItem) => {
          const url = getAppUrl({ deepLinkId: SecurityPageName.rules, path: `id/${id}` });
          return (
            <EuiToolTip
              data-test-subj={`correlationHitRate-${id}-tooltip`}
              title={OPEN_RULE_DETAIL_TOOLTIP}
              content={name}
              anchorClassName="eui-textTruncate"
            >
              {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
              <EuiLink
                data-test-subj="correlationHitRateTable-name"
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
        field: 'alertCount',
        name: COLUMN_ALERT_COUNT,
        'data-test-subj': 'correlationHitRateTable-alertCount',
        render: (alertCount: number, { name }: CorrelationHitRateItem) => (
          <SecurityCellActions
            data={{
              value: name,
              field: ALERT_RULE_NAME,
            }}
            mode={CellActionsMode.HOVER_RIGHT}
            triggerId={SECURITY_CELL_ACTIONS_ALERTS_COUNT}
            sourcererScopeId={PageScope.alerts}
            metadata={{
              andFilters: [{ field: 'kibana.alert.rule.type', value: 'siem.correlationRule' }],
            }}
          >
            <EuiLink
              data-test-subj="correlationHitRateTable-alertCountLink"
              disabled={alertCount === 0}
              onClick={() => openRuleInAlertsPage(name)}
            >
              <FormattedCount count={alertCount} />
            </EuiLink>
          </SecurityCellActions>
        ),
      },
      {
        field: 'lastSeen',
        name: COLUMN_LAST_SEEN,
        'data-test-subj': 'correlationHitRateTable-lastSeen',
        render: (lastSeen: string) => <FormattedRelative value={new Date(lastSeen)} />,
      },
    ],
    [getAppUrl, navigateTo, openRuleInAlertsPage]
  );

export const CorrelationHitRate = React.memo<CorrelationHitRateProps>(({ signalIndexName }) => {
  const { getAppUrl, navigateTo } = useNavigation();
  const { toggleStatus, setToggleStatus } = useQueryToggle(
    DETECTION_RESPONSE_CORRELATION_HIT_RATE_QUERY_ID
  );
  const { filterQuery } = useGlobalFilterQuery();

  const { items, isLoading, updatedAt } = useCorrelationHitRate({
    signalIndexName,
    queryId: DETECTION_RESPONSE_CORRELATION_HIT_RATE_QUERY_ID,
    skip: !toggleStatus,
    filterQuery,
  });

  const openAlertsPageWithFilter = useNavigateToAlertsPageWithFilters();

  const openRuleInAlertsPage = useCallback(
    (ruleName: string) =>
      openAlertsPageWithFilter({
        title: OPEN_IN_ALERTS_TITLE_RULENAME,
        selected_options: [ruleName],
        field_name: ALERT_RULE_NAME,
      }),
    [openAlertsPageWithFilter]
  );

  const navigateToAlerts = useCallback(() => {
    openAlertsPageWithFilter({
      title: OPEN_IN_ALERTS_TITLE_STATUS,
      selected_options: ['open'],
      field_name: ALERT_WORKFLOW_STATUS,
    });
  }, [openAlertsPageWithFilter]);

  const columns = useGetTableColumns({ getAppUrl, navigateTo, openRuleInAlertsPage });

  return (
    <HoverVisibilityContainer show={true} targetClassNames={[INSPECT_BUTTON_CLASS]}>
      <EuiPanel hasBorder data-test-subj="correlationHitRatePanel">
        <HeaderSection
          id={DETECTION_RESPONSE_CORRELATION_HIT_RATE_QUERY_ID}
          title={SECTION_TITLE}
          titleSize="s"
          toggleStatus={toggleStatus}
          toggleQuery={setToggleStatus}
          subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
        />
        {toggleStatus && (
          <>
            <EuiBasicTable
              data-test-subj="correlationHitRateTable"
              columns={columns}
              items={items}
              loading={isLoading}
              noItemsMessage={<EuiEmptyPrompt title={<h3>{NO_ALERTS_FOUND}</h3>} titleSize="xs" />}
              tableCaption={SECTION_TITLE}
            />
            <EuiSpacer size="m" />
            <EuiButton data-test-subj="correlationHitRateButton" onClick={navigateToAlerts}>
              {VIEW_ALL_BUTTON}
            </EuiButton>
          </>
        )}
      </EuiPanel>
    </HoverVisibilityContainer>
  );
});
CorrelationHitRate.displayName = 'CorrelationHitRate';
