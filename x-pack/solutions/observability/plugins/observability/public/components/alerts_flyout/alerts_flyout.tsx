/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  type EuiTabbedContentTab,
  EuiText,
  EuiTitle,
  type EuiTitleProps,
  EuiToolTip,
  EuiButton,
  EuiFlyoutFooter,
} from '@elastic/eui';
import { EuiFlyout, EuiFlyoutHeader, type EuiFlyoutProps } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import { ALERT_RULE_CATEGORY, ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { SLO_ALERTS_TABLE_ID } from '@kbn/observability-shared-plugin/common';
import { AlertFieldsTable, ScrollableFlyoutTabbedContent } from '@kbn/alerts-ui-shared';
import {
  getAlertFlyoutAriaLabel,
  ALERT_FLYOUT_DEFAULT_TITLE,
} from '@kbn/response-ops-alerts-table/translations';
import { getAlertSubtitle } from '../../utils/format_alert_subtitle';
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
  /** When set (e.g. `'inherit'`), docks beside a parent flyout in EUI's session manager. */
  flyoutSession?: EuiFlyoutProps['session'];
  ownFocus?: boolean;
  /** EUI flyout width. Defaults to `'m'`. Use `'s'` when stacking as a child flyout. */
  flyoutSize?: EuiFlyoutProps['size'];
  /** Title typography; defaults to `'m'`. Use `'s'` to match entity-centric lab parent flyout. */
  flyoutTitleSize?: EuiTitleProps['size'];
}

export function AlertsFlyout({
  alert,
  isLoading,
  tableId,
  onClose,
  observabilityRuleTypeRegistry,
  headerAppend,
  flyoutSession,
  ownFocus = true,
  flyoutSize = 'm',
  flyoutTitleSize = 'm',
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
      size={flyoutSize}
      data-test-subj="alertsFlyout"
      aria-label={ariaLabel}
      session={flyoutSession}
      ownFocus={ownFocus}
      // Child flyouts dock beside the entity flyout; the handle lets the
      // user widen the alert panel the same way the parent flyout can.
      resizable={flyoutSession === 'inherit'}
    >
      <EuiFlyoutHeader
        hasBorder
        css={flyoutTitleSize === 's' ? css`padding-bottom: 0;` : undefined}
      >
        {flyoutTitleSize === 'm' ? <EuiSpacer size="s" /> : null}
        <EuiTitle size={flyoutTitleSize} data-test-subj="alertsFlyoutTitle">
          <h2>
            {alert?.[ALERT_RULE_NAME] ? (
              <EuiToolTip content={alert[ALERT_RULE_NAME]?.[0] as string}>
                <span
                  css={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    wordBreak: 'break-word',
                  }}
                >
                  {alert[ALERT_RULE_NAME]?.[0] as string}
                </span>
              </EuiToolTip>
            ) : (
              i18n.translate('xpack.observability.alertFlyout.defaultTitle', {
                defaultMessage: 'Alert detail',
              })
            )}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        {alert?.[ALERT_RULE_CATEGORY] && (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiText size="s" color="subdued">
              {getAlertSubtitle(alert[ALERT_RULE_CATEGORY]?.[0] as string)}
            </EuiText>
            {alert?.[ALERT_RULE_UUID] && (
              <EuiText size="s">
                <EuiLink
                  data-test-subj="o11yAlertFlyoutRuleLink"
                  href={prepend(
                    paths.observability.ruleDetails(alert[ALERT_RULE_UUID]?.[0] as string)
                  )}
                >
                  {i18n.translate('xpack.observability.alertFlyout.viewRule', {
                    defaultMessage: 'View rule',
                  })}
                </EuiLink>
              </EuiText>
            )}
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
