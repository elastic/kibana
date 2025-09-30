/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  type EuiTabbedContentTab,
  EuiText,
  EuiTitle,
  EuiButton,
  EuiFlyoutFooter,
} from '@elastic/eui';
import { EuiFlyout, EuiFlyoutHeader } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import { ALERT_RULE_CATEGORY, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { SLO_ALERTS_TABLE_ID } from '@kbn/observability-shared-plugin/common';
import { AlertFieldsTable, ScrollableFlyoutTabbedContent } from '@kbn/alerts-ui-shared';
import {
  getAlertFlyoutAriaLabel,
  ALERT_FLYOUT_DEFAULT_TITLE,
} from '@kbn/response-ops-alerts-table/translations';
import { getAlertTitle } from '../../utils/format_alert_title';
import { parseAlert } from '../../pages/alerts/helpers/parse_alert';
import { paths } from '../../../common/locators/paths';
import { AlertOverview } from '../alert_overview/alert_overview';
import { useKibana } from '../../utils/kibana_react';
import type { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';

type TabId = 'overview' | 'table';

export interface AlertsFlyoutProps {
  alert?: Alert;
  isLoading?: boolean;
  tableId?: string;
  onClose: () => void;
  headerAppend?: React.ReactNode;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
}

export function AlertsFlyout({
  alert,
  isLoading,
  tableId,
  onClose,
  observabilityRuleTypeRegistry,
  headerAppend,
}: AlertsFlyoutProps) {
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;

  const parsedAlert = alert ? parseAlert(observabilityRuleTypeRegistry)(alert) : null;

  const overviewTab = useMemo(() => {
    return {
      id: 'overview',
      'data-test-subj': 'observabilityAlertFlyoutOverviewTab',
      name: i18n.translate('xpack.observability.alertFlyout.overview', {
        defaultMessage: 'Overview',
      }),
      content: parsedAlert && (
        <EuiPanel hasShadow={false} data-test-subj="observabilityAlertFlyoutOverviewTabPanel">
          <AlertOverview alert={parsedAlert} pageId={tableId} />
        </EuiPanel>
      ),
    };
  }, [parsedAlert, tableId]);

  const metadataTab = useMemo(
    () => ({
      id: 'metadata',
      'data-test-subj': 'observabilityAlertFlyoutMetadataTab',
      name: i18n.translate('xpack.observability.alertsFlyout.metadata', {
        defaultMessage: 'Metadata',
      }),
      content: alert && (
        <EuiPanel hasShadow={false} data-test-subj="observabilityAlertFlyoutMetadataTabPanel">
          <AlertFieldsTable alert={alert} />
        </EuiPanel>
      ),
    }),
    [alert]
  );

  const tabs = useMemo(() => [overviewTab, metadataTab], [overviewTab, metadataTab]);
  const [selectedTabId, setSelectedTabId] = useState<TabId>('overview');
  const handleTabClick = useCallback(
    (tab: EuiTabbedContentTab) => setSelectedTabId(tab.id as TabId),
    []
  );

  const selectedTab = useMemo(
    () => tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0],
    [tabs, selectedTabId]
  );

  const viewInAppUrl = useMemo(() => {
    if (!parsedAlert) {
      return undefined;
    }
    if (!parsedAlert.hasBasePath) {
      return prepend(parsedAlert.link ?? '');
    }
    return parsedAlert.link;
  }, [parsedAlert, prepend]);

  const ariaLabel =
    alert && alert[ALERT_RULE_CATEGORY]
      ? getAlertFlyoutAriaLabel(String(alert[ALERT_RULE_CATEGORY]))
      : ALERT_FLYOUT_DEFAULT_TITLE;

  return (
    <EuiFlyout
      className="oblt__flyout"
      onClose={onClose}
      size="m"
      data-test-subj="alertsFlyout"
      aria-label={ariaLabel}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiSpacer size="s" />
        <EuiTitle size="m" data-test-subj="alertsFlyoutTitle">
          <h2>
            {alert
              ? getAlertTitle(alert[ALERT_RULE_CATEGORY]?.[0] as string)
              : i18n.translate('xpack.observability.alertFlyout.defaultTitle', {
                  defaultMessage: 'Alert detail',
                })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        {alert?.[ALERT_RULE_NAME] && (
          <EuiFlexGroup gutterSize="none" alignItems="center">
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.observability.alertFlyout.title.ruleName"
                defaultMessage="Rule"
              />
              :&nbsp;
            </EuiText>
            <EuiText size="s">{alert[ALERT_RULE_NAME]?.[0] as string}</EuiText>
          </EuiFlexGroup>
        )}
        {headerAppend}
      </EuiFlyoutHeader>

      {isLoading ? (
        // Display a loading indicator if a new page is being loaded
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" data-test-subj="alertFlyoutLoading" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        alert && (
          <ScrollableFlyoutTabbedContent
            tabs={tabs}
            selectedTab={selectedTab}
            onTabClick={handleTabClick}
            expand
            data-test-subj="alertFlyoutTabs"
          />
        )
      )}

      {parsedAlert && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            {!parsedAlert.link || tableId === SLO_ALERTS_TABLE_ID ? null : (
              <EuiFlexItem grow={false}>
                <EuiButton data-test-subj="alertsFlyoutViewInAppButton" fill href={viewInAppUrl}>
                  {i18n.translate('xpack.observability.alertsFlyout.viewInAppButtonText', {
                    defaultMessage: 'View in app',
                  })}
                </EuiButton>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="alertsFlyoutAlertDetailsButton"
                fill
                href={
                  prepend &&
                  prepend(paths.observability.alertDetails(parsedAlert.fields['kibana.alert.uuid']))
                }
              >
                {i18n.translate('xpack.observability.alertsFlyout.alertsDetailsButtonText', {
                  defaultMessage: 'Alert details',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertsFlyout;
