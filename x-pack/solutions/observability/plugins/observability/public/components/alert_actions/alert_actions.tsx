/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexItem,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useRouteMatch } from 'react-router-dom';
import { SLO_ALERTS_TABLE_ID } from '@kbn/observability-shared-plugin/common';
import { DefaultAlertActions } from '@kbn/response-ops-alerts-table/components/default_alert_actions';
import { useCaseActions } from './use_case_actions';
import { RULE_DETAILS_PAGE_ID } from '../../pages/rule_details/constants';
import { paths, SLO_DETAIL_PATH } from '../../../common/locators/paths';
import { parseAlert } from '../../pages/alerts/helpers/parse_alert';
import type { GetObservabilityAlertsTableProp, ObservabilityAlertsTableContext } from '../..';
import { observabilityFeatureId } from '../..';
import { ALERT_DETAILS_PAGE_ID } from '../../pages/alert_details/alert_details';
import { useKibana } from '../../utils/kibana_react';
import { ALERT_SOURCE } from '../alerts_table/common/get_columns';
import datadogIcon from '../../assets/icons/datadog.svg';

// Actions API base path
const ACTIONS_API_PATH = '/api/actions';

/**
 * Checks if an alert is an external alert (from third-party source)
 */
function isExternalAlert(alert: Record<string, unknown>): boolean {
  const source = alert[ALERT_SOURCE]?.[0] as string | undefined;
  return !!source && source !== 'kibana' && source !== '--';
}

export function AlertActions(
  props: React.ComponentProps<GetObservabilityAlertsTableProp<'renderActionsCell'>>
) {
  const {
    observabilityRuleTypeRegistry,
    alert,
    tableId,
    refresh,
    parentAlert,
    rowIndex,
    onExpandedAlertIndexChange,
    services,
  } = props;
  const {
    http: {
      basePath: { prepend },
    },
    cases,
  } = services;
  const isSLODetailsPage = useRouteMatch(SLO_DETAIL_PATH);
  const { telemetryClient, notifications } = useKibana().services;

  const isExternal = isExternalAlert(alert);
  const isInApp = Boolean(tableId === SLO_ALERTS_TABLE_ID && isSLODetailsPage);

  const userCasesPermissions = cases?.helpers.canUseCases([observabilityFeatureId]);
  const [viewInAppUrl, setViewInAppUrl] = useState<string>();
  const [isMutedLocally, setIsMutedLocally] = useState(false);

  // External alert fields
  const externalUrl = alert['kibana.alert.external_url']?.[0] as string | undefined;
  const alertSource = alert[ALERT_SOURCE]?.[0] as string | undefined;
  const connectorId = alert['kibana.alert.connector_id']?.[0] as string | undefined;

  const parseObservabilityAlert = useMemo(
    () => parseAlert(observabilityRuleTypeRegistry),
    [observabilityRuleTypeRegistry]
  );

  const observabilityAlert = parseObservabilityAlert(alert);

  useEffect(() => {
    if (isExternal) {
      setViewInAppUrl(externalUrl);
    } else {
    const alertLink = observabilityAlert.link;
    if (!observabilityAlert.hasBasePath && prepend) {
      setViewInAppUrl(prepend(alertLink ?? ''));
    } else {
      setViewInAppUrl(alertLink);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewInAppUrl = useCallback(() => {
    if (isExternal) {
      setViewInAppUrl(externalUrl);
    } else {
    const alertLink = observabilityAlert.link as unknown as string;
    if (!observabilityAlert.hasBasePath) {
      setViewInAppUrl(prepend(alertLink ?? ''));
    } else {
      setViewInAppUrl(alertLink);
    }
    }
  }, [isExternal, externalUrl, observabilityAlert.link, observabilityAlert.hasBasePath, prepend]);

  const onAddToCase = useCallback(
    ({ isNewCase }: { isNewCase: boolean }) => {
      telemetryClient.reportAlertAddedToCase(
        isNewCase,
        tableId || 'unknown',
        observabilityAlert.fields['kibana.alert.rule.rule_type_id']
      );

      refresh?.();
    },
    [telemetryClient, tableId, observabilityAlert.fields, refresh]
  );

  const { isPopoverOpen, setIsPopoverOpen, handleAddToExistingCaseClick, handleAddToNewCaseClick } =
    useCaseActions({
      onAddToCase,
      alerts: [alert],
      services: {
        cases,
      },
    });

  const closeActionsPopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  const toggleActionsPopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  // Handle external alert actions
  const handleCopyAlertLink = useCallback(() => {
    if (externalUrl) {
      navigator.clipboard.writeText(externalUrl);
      notifications?.toasts.addSuccess({
        title: i18n.translate('xpack.observability.alerts.actions.linkCopied', {
          defaultMessage: 'Link copied to clipboard',
        }),
      });
    }
    closeActionsPopover();
  }, [externalUrl, notifications, closeActionsPopover]);

  const handleViewInSource = useCallback(() => {
    if (externalUrl) {
      window.open(externalUrl, '_blank');
    }
    closeActionsPopover();
  }, [externalUrl, closeActionsPopover]);

  // Extract monitor ID from raw payload (Datadog specific)
  const getMonitorId = useCallback((): number | undefined => {
    const rawPayload = alert['kibana.alert.raw_payload']?.[0];
    if (rawPayload) {
      try {
        const payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
        const rawId = payload.monitor_id || payload.monitorId || payload.alertId;
        return rawId ? Number(rawId) : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, [alert]);

  // Handle mute/unmute action for external alerts via connector
  const handleMuteToggleInSource = useCallback(async () => {
    if (!connectorId) {
      notifications?.toasts.addWarning({
        title: i18n.translate('xpack.observability.alerts.actions.noConnector', {
          defaultMessage: 'No connector associated with this alert',
        }),
      });
      closeActionsPopover();
      return;
    }

    const monitorId = getMonitorId();

    if (!monitorId || isNaN(monitorId)) {
      notifications?.toasts.addWarning({
        title: i18n.translate('xpack.observability.alerts.actions.noMonitorId', {
          defaultMessage: 'Could not find monitor ID in alert payload',
        }),
      });
      closeActionsPopover();
      return;
    }

    const action = isMutedLocally ? 'unmuteMonitor' : 'muteMonitor';
    const actionLabel = isMutedLocally ? 'unmuted' : 'muted';

    try {
      const { http } = services;
      
      // Execute the connector's mute/unmute action
      const response = await http.post<{
        status: string;
        data?: { success?: boolean; error?: string; data?: unknown };
        message?: string;
      }>(`${ACTIONS_API_PATH}/connector/${connectorId}/_execute`, {
        body: JSON.stringify({
          params: {
            subAction: action,
            subActionParams: {
              monitorId,
              ...(isMutedLocally && { allScopes: true }), // Unmute all scopes
            },
          },
        }),
      });

      // Check if the connector execution was successful
      if (response.status === 'ok' && response.data?.success) {
        setIsMutedLocally(!isMutedLocally);
        notifications?.toasts.addSuccess({
          title: i18n.translate('xpack.observability.alerts.actions.muteToggleSuccess', {
            defaultMessage: 'Monitor {action} in Datadog',
            values: { action: actionLabel },
          }),
          text: i18n.translate('xpack.observability.alerts.actions.muteToggleSuccessText', {
            defaultMessage: 'Monitor {monitorId} has been {action}',
            values: { monitorId, action: actionLabel },
          }),
        });
      } else if (response.status === 'error' || response.data?.error) {
        throw new Error(response.data?.error || response.message || 'Unknown error');
      } else {
        // Assume success if no error
        setIsMutedLocally(!isMutedLocally);
        notifications?.toasts.addSuccess({
          title: i18n.translate('xpack.observability.alerts.actions.muteToggleSuccess', {
            defaultMessage: 'Monitor {action} in Datadog',
            values: { action: actionLabel },
          }),
        });
      }
      
      refresh?.();
    } catch (error) {
      notifications?.toasts.addDanger({
        title: i18n.translate('xpack.observability.alerts.actions.muteToggleError', {
          defaultMessage: 'Failed to {action} monitor',
          values: { action: isMutedLocally ? 'unmute' : 'mute' },
        }),
        text: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    closeActionsPopover();
  }, [connectorId, getMonitorId, isMutedLocally, services, notifications, closeActionsPopover, refresh]);

  // External alert menu items
  const externalAlertMenuItems = useMemo(() => {
    const items: React.ReactElement[] = [];

    if (externalUrl) {
      items.push(
        <EuiContextMenuItem
          data-test-subj="view-in-source-action"
          key="viewInSource"
          onClick={handleViewInSource}
          icon="popout"
          size="s"
        >
          {i18n.translate('xpack.observability.alerts.actions.viewInSource', {
            defaultMessage: 'View in {source}',
            values: { source: alertSource || 'Source' },
          })}
        </EuiContextMenuItem>
      );

      items.push(
        <EuiContextMenuItem
          data-test-subj="copy-alert-link-action"
          key="copyAlertLink"
          onClick={handleCopyAlertLink}
          icon="copy"
          size="s"
        >
          {i18n.translate('xpack.observability.alerts.actions.copyLink', {
            defaultMessage: 'Copy link',
          })}
        </EuiContextMenuItem>
      );
    }

    // Add to case is still available for external alerts
    if (userCasesPermissions?.createComment && userCasesPermissions?.read) {
      items.push(
        <EuiContextMenuItem
          data-test-subj="add-to-existing-case-action"
          key="addToExistingCase"
          onClick={handleAddToExistingCaseClick}
          icon="folderClosed"
          size="s"
        >
          {i18n.translate('xpack.observability.alerts.actions.addToCase', {
            defaultMessage: 'Add to existing case',
          })}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          data-test-subj="add-to-new-case-action"
          key="addToNewCase"
          onClick={handleAddToNewCaseClick}
          icon="folderOpen"
          size="s"
        >
          {i18n.translate('xpack.observability.alerts.actions.addToNewCase', {
            defaultMessage: 'Add to new case',
          })}
        </EuiContextMenuItem>
      );
    }

    // Connector-specific actions - Mute/Unmute alert in source system
    if (connectorId && alertSource?.toLowerCase() === 'datadog') {
      items.push(
        <EuiContextMenuItem
          data-test-subj="mute-in-source-action"
          key="muteInSource"
          onClick={handleMuteToggleInSource}
          icon={<EuiIcon type={datadogIcon} size="m" />}
          size="s"
        >
          {isMutedLocally
            ? i18n.translate('xpack.observability.alerts.actions.unmuteInDatadog', {
                defaultMessage: 'Unmute in Datadog',
              })
            : i18n.translate('xpack.observability.alerts.actions.muteInDatadog', {
                defaultMessage: 'Mute in Datadog',
              })}
        </EuiContextMenuItem>
      );
    } else if (connectorId) {
      // For other sources, show disabled mute action with info
      items.push(
        <EuiContextMenuItem
          data-test-subj="mute-in-source-action"
          key="muteInSource"
          onClick={() => {
            notifications?.toasts.addInfo({
              title: i18n.translate('xpack.observability.alerts.actions.muteNotSupported', {
                defaultMessage: 'Mute action not yet supported for {source}',
                values: { source: alertSource || 'this source' },
              }),
            });
            closeActionsPopover();
          }}
          icon="bellSlash"
          size="s"
          disabled={true}
        >
          {i18n.translate('xpack.observability.alerts.actions.muteInSource', {
            defaultMessage: 'Mute in {source}',
            values: { source: alertSource || 'Source' },
          })}
        </EuiContextMenuItem>
      );
    }

    return items;
  }, [
    externalUrl,
    alertSource,
    connectorId,
    userCasesPermissions,
    isMutedLocally,
    handleViewInSource,
    handleCopyAlertLink,
    handleMuteToggleInSource,
    handleAddToExistingCaseClick,
    handleAddToNewCaseClick,
    notifications,
    closeActionsPopover,
  ]);

  // Kibana alert menu items
  const kibanaAlertMenuItems = [
    ...(userCasesPermissions?.createComment && userCasesPermissions?.read
      ? [
          <EuiContextMenuItem
            data-test-subj="add-to-existing-case-action"
            key="addToExistingCase"
            onClick={handleAddToExistingCaseClick}
            size="s"
          >
            {i18n.translate('xpack.observability.alerts.actions.addToCase', {
              defaultMessage: 'Add to existing case',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            data-test-subj="add-to-new-case-action"
            key="addToNewCase"
            onClick={handleAddToNewCaseClick}
            size="s"
          >
            {i18n.translate('xpack.observability.alerts.actions.addToNewCase', {
              defaultMessage: 'Add to new case',
            })}
          </EuiContextMenuItem>,
        ]
      : []),
    useMemo(
      () => (
        <DefaultAlertActions<ObservabilityAlertsTableContext>
          {...props}
          key="defaultRowActions"
          onActionExecuted={closeActionsPopover}
          isAlertDetailsEnabled={true}
          resolveRulePagePath={(ruleId, currentPageId) =>
            currentPageId !== RULE_DETAILS_PAGE_ID ? paths.observability.ruleDetails(ruleId) : null
          }
          resolveAlertPagePath={(alertId, currentPageId) =>
            currentPageId !== ALERT_DETAILS_PAGE_ID
              ? paths.observability.alertDetails(alertId)
              : null
          }
        />
      ),
      [closeActionsPopover, props]
    ),
  ];

  const actionsMenuItems = isExternal ? externalAlertMenuItems : kibanaAlertMenuItems;

  const actionsToolTip =
    actionsMenuItems.length <= 0
      ? i18n.translate('xpack.observability.alertsTable.notEnoughPermissions', {
          defaultMessage: 'Additional privileges required',
        })
      : i18n.translate('xpack.observability.alertsTable.moreActionsTextLabel', {
          defaultMessage: 'More actions',
        });

  const onExpandEvent = () => {
    onExpandedAlertIndexChange(rowIndex);
  };

  const hideViewInApp = isInApp || viewInAppUrl === '' || parentAlert;

  // For external alerts, show "View in Source" instead of "View in app"
  const viewInAppLabel = isExternal
    ? i18n.translate('xpack.observability.alertsTable.viewInSourceTextLabel', {
        defaultMessage: 'View in {source}',
        values: { source: alertSource || 'Source' },
      })
    : i18n.translate('xpack.observability.alertsTable.viewInAppTextLabel', {
        defaultMessage: 'View in app',
      });

  return (
    <>
      {!parentAlert && (
        <EuiFlexItem>
          <EuiToolTip
            data-test-subj="expand-event-tool-tip"
            content={VIEW_DETAILS}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              data-test-subj="expand-event"
              iconType="expand"
              onClick={onExpandEvent}
              size="s"
              color="text"
              aria-label={VIEW_DETAILS}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {!hideViewInApp && (
        <EuiFlexItem>
          <EuiToolTip content={viewInAppLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="o11yAlertActionsButton"
              aria-label={viewInAppLabel}
              color="text"
              onMouseOver={handleViewInAppUrl}
              onClick={() => window.open(viewInAppUrl, isExternal ? '_blank' : '_self')}
              iconType={isExternal ? 'popout' : 'eye'}
              size="s"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}

      <EuiFlexItem
        css={{
          textAlign: 'center',
        }}
        grow={parentAlert ? false : undefined}
      >
        <EuiPopover
          anchorPosition="downLeft"
          button={
            <EuiToolTip content={actionsToolTip} disableScreenReaderOutput>
              <EuiButtonIcon
                aria-label={actionsToolTip}
                color="text"
                data-test-subj="alertsTableRowActionMore"
                display="empty"
                iconType="boxesHorizontal"
                onClick={toggleActionsPopover}
                size="s"
              />
            </EuiToolTip>
          }
          closePopover={closeActionsPopover}
          isOpen={isPopoverOpen}
          panelPaddingSize="none"
        >
          <EuiContextMenuPanel
            size="s"
            items={actionsMenuItems}
            data-test-subj="alertsTableActionsMenu"
          />
        </EuiPopover>
      </EuiFlexItem>
    </>
  );
}

// Default export used for lazy loading
// eslint-disable-next-line import/no-default-export
export default AlertActions;

const VIEW_DETAILS = i18n.translate('xpack.observability.alertsTable.viewDetailsTextLabel', {
  defaultMessage: 'Alert details',
});

export type AlertActions = typeof AlertActions;
