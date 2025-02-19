/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { capitalize } from 'lodash';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiLoadingSpinner,
  EuiFlexItem,
  EuiText,
  type EuiFlexGroupProps,
  useEuiTheme,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { InsightDistributionBar } from './insight_distribution_bar';
import { getSeverityColor } from '../../../../detections/components/alerts_kpis/severity_level_panel/helpers';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { InvestigateInTimelineButton } from '../../../../common/components/event_details/investigate_in_timeline_button';
import {
  getDataProvider,
  getDataProviderAnd,
} from '../../../../common/components/event_details/use_action_cell_data_provider';
import { FILTER_CLOSED, IS_OPERATOR } from '../../../../../common/types';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useAlertsByStatus } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../../../overview/components/detection_response/alerts_by_status/types';
import type {
  AlertsByStatus,
  ParsedAlertsData,
} from '../../../../overview/components/detection_response/alerts_by_status/types';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import {
  INSIGHTS_ALERTS_COUNT_INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID,
  INSIGHTS_ALERTS_COUNT_TEXT_TEST_ID,
  INSIGHTS_ALERTS_COUNT_NAVIGATION_BUTTON_TEST_ID,
} from './test_ids';
import type { EntityDetailsPath } from '../../../entity_details/shared/components/left_panel/left_panel_header';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import {
  CspInsightLeftPanelSubTab,
  EntityDetailsLeftPanelTab,
} from '../../../entity_details/shared/components/left_panel/left_panel_header';

interface AlertCountInsightProps {
  /**
   * The name of the entity to filter the alerts by.
   */
  name: string;
  /**
   * The field name to filter the alerts by.
   */
  fieldName: 'host.name' | 'user.name';
  /**
   * The direction of the flex group.
   */
  direction?: EuiFlexGroupProps['direction'];
  /**
   * The data-test-subj to use for the component.
   */
  ['data-test-subj']?: string;
  /**
   * The function to open the details panel.
   */
  openDetailsPanel: (path: EntityDetailsPath) => void;
}

/**
 * Filters closed alerts and format the alert stats for the distribution bar
 */
export const getFormattedAlertStats = (
  alertsData: ParsedAlertsData,
  euiTheme: EuiThemeComputed
) => {
  const severityMap = new Map<string, number>();

  const filteredAlertsData: ParsedAlertsData = alertsData
    ? Object.fromEntries(Object.entries(alertsData).filter(([key]) => key !== FILTER_CLOSED))
    : {};

  (Object.keys(filteredAlertsData || {}) as AlertsByStatus[]).forEach((status) => {
    if (filteredAlertsData?.[status]?.severities) {
      filteredAlertsData?.[status]?.severities.forEach((severity) => {
        const currentSeverity = severityMap.get(severity.key) || 0;
        severityMap.set(severity.key, currentSeverity + severity.value);
      });
    }
  });

  const alertStats = Array.from(severityMap, ([key, count]) => ({
    key: capitalize(key),
    count,
    color: getSeverityColor(key, euiTheme),
  }));
  return alertStats;
};

/*
 * Displays a distribution bar with the total alert count for a given entity
 */
export const AlertCountInsight: React.FC<AlertCountInsightProps> = ({
  name,
  fieldName,
  direction,
  openDetailsPanel,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    timelinePrivileges: { read: canUseTimeline },
  } = useUserPrivileges();

  const isNewNavigationEnabled = useIsExperimentalFeatureEnabled(
    'newExpandableFlyoutNavigationEnabled'
  );
  const entityFilter = useMemo(() => ({ field: fieldName, value: name }), [fieldName, name]);
  const { to, from } = useGlobalTime();
  const { signalIndexName } = useSignalIndex();

  const { items, isLoading } = useAlertsByStatus({
    entityFilter,
    signalIndexName,
    queryId: DETECTION_RESPONSE_ALERTS_BY_STATUS_ID,
    to,
    from,
  });

  const alertStats = useMemo(() => getFormattedAlertStats(items, euiTheme), [items, euiTheme]);

  const totalAlertCount = useMemo(
    () => alertStats.reduce((acc, item) => acc + item.count, 0),
    [alertStats]
  );

  const dataProviders = useMemo(
    () => [
      {
        ...getDataProvider(fieldName, `timeline-indicator-${fieldName}-${name}`, name),
        and: [
          getDataProviderAnd(
            'kibana.alert.workflow_status',
            `timeline-indicator-kibana.alert.workflow_status-not-closed}`,
            FILTER_CLOSED,
            IS_OPERATOR,
            true
          ),
        ],
      },
    ],
    [fieldName, name]
  );

  // renders either a button to go to host alert details, open timeline or just plain text depending on the user's timeline privileges
  const alertCount = useMemo(() => {
    const formattedAlertCount = <FormattedCount count={totalAlertCount} />;

    if (isNewNavigationEnabled) {
      return (
        <EuiToolTip
          content={
            <FormattedMessage
              id="xpack.securitySolution.flyout.insights.alert.alertCountTooltip"
              defaultMessage="Opens list of alerts in a new flyout"
            />
          }
        >
          <EuiLink
            data-test-subj={INSIGHTS_ALERTS_COUNT_NAVIGATION_BUTTON_TEST_ID}
            onClick={() =>
              openDetailsPanel({
                tab: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
                subTab: CspInsightLeftPanelSubTab.ALERTS,
              })
            }
          >
            {formattedAlertCount}
          </EuiLink>
        </EuiToolTip>
      );
    }

    if (!canUseTimeline) {
      return (
        <EuiText size="xs" data-test-subj={INSIGHTS_ALERTS_COUNT_TEXT_TEST_ID}>
          {formattedAlertCount}
        </EuiText>
      );
    }
    return (
      <InvestigateInTimelineButton
        asEmptyButton
        dataProviders={dataProviders}
        flush={'both'}
        data-test-subj={INSIGHTS_ALERTS_COUNT_INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID}
      >
        {formattedAlertCount}
      </InvestigateInTimelineButton>
    );
  }, [canUseTimeline, dataProviders, totalAlertCount, isNewNavigationEnabled, openDetailsPanel]);

  if (!isLoading && totalAlertCount === 0) return null;

  return (
    <EuiFlexItem data-test-subj={dataTestSubj}>
      {isLoading ? (
        <EuiLoadingSpinner size="m" data-test-subj={`${dataTestSubj}-loading-spinner`} />
      ) : (
        <InsightDistributionBar
          title={
            <FormattedMessage
              id="xpack.securitySolution.insights.alertCountTitle"
              defaultMessage="Alerts:"
            />
          }
          stats={alertStats}
          count={<div data-test-subj={`${dataTestSubj}-count`}>{alertCount}</div>}
          direction={direction}
          data-test-subj={`${dataTestSubj}-distribution-bar`}
        />
      )}
    </EuiFlexItem>
  );
};

AlertCountInsight.displayName = 'AlertCountInsight';
