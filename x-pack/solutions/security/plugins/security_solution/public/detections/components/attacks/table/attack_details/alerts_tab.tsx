/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import React, { useMemo, useCallback } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiCallOut, EuiSwitch } from '@elastic/eui';
import styled from '@emotion/styled';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Alert } from '@kbn/alerting-types';
import { TableId } from '@kbn/securitysolution-data-table';
import { PageScope } from '../../../../../data_view_manager/constants';
import { AlertsTable } from '../../../alerts_table';
import { useFilteredRelatedAlertIds } from './use_filtered_related_alert_ids';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../../../common/lib/telemetry';
import { useLocalStorage } from '../../../../../common/components/local_storage';
import { getSettingKey } from '../../../../../common/components/local_storage/helpers';
import { ATTACKS_PAGE, ATTACK_GROUP_DETAILS_CATEGORY } from '../../constants';
import * as i18n from './translations';
import { ALERT_BUILDING_BLOCK_TYPE } from '../../../../../../common/field_maps/field_names';

export const ALERTS_TAB_TEST_ID = 'alertsTab';
export const ALERTS_TAB_FILTERING_MODE_CONTROL_TEST_ID = 'alertsTabFilteringModeControl';
export const ALERTS_TAB_CALLOUT_TEST_ID = 'alertsTabCallout';

const SHOW_MATCHING_ALERTS_ONLY_SETTING_NAME = 'showMatchingAlertsOnly';

const AlertsTabContainer = styled.div<{ $highlightFilteredOutAlerts: boolean }>`
  ${({ $highlightFilteredOutAlerts, theme }) =>
    $highlightFilteredOutAlerts
      ? `
        && .alertsTableHighlightedRow.alertsTableHighlightedRow,
        && .alertsTableHighlightedRow.alertsTableHighlightedRow .euiDataGridRowCell {
          background-color: ${theme.euiTheme.colors.backgroundBaseDisabled};
        }
      `
      : ''}
`;

interface AlertsTabProps {
  /** The alert ids of the selected attack */
  attackAlertIds: string[];
  /** Default filters to apply to the alerts table */
  defaultFilters: Filter[];
  /** Whether the alerts table is in a loading state */
  isTableLoading: boolean;
}

/**
 * Component that displays the alerts tab content, rendering an AlertsTable
 * with filters for the specific attack's alerts.
 */
export const AlertsTab = React.memo<AlertsTabProps>(
  ({ attackAlertIds, defaultFilters, isTableLoading }) => {
    const {
      services: { telemetry },
    } = useKibana();

    const [showMatchingAlertsOnly, setShowMatchingAlertsOnly] = useLocalStorage<boolean>({
      defaultValue: false,
      key: getSettingKey({
        page: ATTACKS_PAGE,
        category: ATTACK_GROUP_DETAILS_CATEGORY,
        setting: SHOW_MATCHING_ALERTS_ONLY_SETTING_NAME,
      }),
    });

    const attackAlertsFilter = useMemo<Filter>(
      () => ({
        meta: {
          alias: null,
          disabled: false,
          negate: false,
          type: 'custom',
        },
        query: {
          ids: { values: attackAlertIds },
        },
      }),
      [attackAlertIds]
    );

    const filteredRelatedAlertFilters = useMemo(() => [...defaultFilters], [defaultFilters]);

    const {
      filteredAlertIds,
      isLoading: isFilteredAlertIdsLoading,
      isReady: filteredAlertIdsReady,
    } = useFilteredRelatedAlertIds({
      attackAlertIds,
      filters: filteredRelatedAlertFilters,
      enabled: !showMatchingAlertsOnly,
    });

    const shouldHighlightFilteredOutAlert = useCallback(
      (alert: Alert) => {
        if (alert[ALERT_BUILDING_BLOCK_TYPE]) return true; // preserve default building block highlight
        return filteredAlertIdsReady && !filteredAlertIds.has(alert._id);
      },
      [filteredAlertIds, filteredAlertIdsReady]
    );

    const hasFilteredOutAlerts =
      filteredAlertIdsReady && filteredAlertIds.size < attackAlertIds.length;

    const onToggleChange = useCallback(
      (e: EuiSwitchEvent) => {
        const checked = e.target.checked;
        setShowMatchingAlertsOnly(checked);
        telemetry.reportEvent(AttacksEventTypes.ViewOptionChanged, {
          option: 'showMatchingAlertsOnly',
          enabled: checked,
        });
      },
      [setShowMatchingAlertsOnly, telemetry]
    );

    return (
      <AlertsTabContainer
        data-test-subj={ALERTS_TAB_TEST_ID}
        $highlightFilteredOutAlerts={!showMatchingAlertsOnly && hasFilteredOutAlerts}
      >
        {(hasFilteredOutAlerts || showMatchingAlertsOnly) && (
          <>
            <EuiCallOut
              announceOnMount
              color="primary"
              iconType="iInCircle"
              data-test-subj={ALERTS_TAB_CALLOUT_TEST_ID}
            >
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <span>
                    <FormattedMessage
                      id="xpack.securitySolution.detectionEngine.attacks.attackDetails.alertsFilteringMode.filteredOutHighlightDescription"
                      defaultMessage="This filter applies to attacks, not individual alerts. {highlightedGreyRows} may not include the filtered field."
                      values={{ highlightedGreyRows: <strong>{'Grey rows'}</strong> }}
                    />
                  </span>
                </EuiFlexItem>
                <EuiSpacer size="m" />
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    label={i18n.SHOW_MATCHING_ALERTS_ONLY}
                    checked={showMatchingAlertsOnly}
                    onChange={onToggleChange}
                    data-test-subj={ALERTS_TAB_FILTERING_MODE_CONTROL_TEST_ID}
                    compressed
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        <AlertsTable
          tableType={TableId.alertsOnAttacksPage}
          inputFilters={[...defaultFilters, attackAlertsFilter]}
          isLoading={isTableLoading || (!showMatchingAlertsOnly && isFilteredAlertIdsLoading)}
          pageScope={PageScope.alerts} // show only detection alerts
          disableAdditionalToolbarControls={true}
          {...(!showMatchingAlertsOnly
            ? {
                query: { ids: { values: attackAlertIds } },
                shouldHighlightRow: shouldHighlightFilteredOutAlert,
              }
            : {})}
        />
      </AlertsTabContainer>
    );
  }
);
AlertsTab.displayName = 'AlertsTab';
