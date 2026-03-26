/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useRouteMatch } from 'react-router-dom';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared/src/common/hooks';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { ALERT_RULE_TYPE_ID, isSiemRuleType } from '@kbn/rule-data-utils';
import { SLO_ALERTS_TABLE_ID } from '@kbn/observability-shared-plugin/common';
import { AcknowledgeAlertAction } from '@kbn/response-ops-alerts-table/components/acknowledge_alert_action';
import { EditTagsAction } from '@kbn/response-ops-alerts-table/components/edit_tags_action';
import { MarkAsUntrackedAlertAction } from '@kbn/response-ops-alerts-table/components/mark_as_untracked_alert_action';
import { MuteAlertAction } from '@kbn/response-ops-alerts-table/components/mute_alert_action';
import { SnoozeNotificationsPopoverPanel } from '@kbn/response-ops-alerts-table/components/snooze_notifications_popover_panel';
import { ViewAlertDetailsAlertAction } from '@kbn/response-ops-alerts-table/components/view_alert_details_alert_action';
import { ViewRuleDetailsAlertAction } from '@kbn/response-ops-alerts-table/components/view_rule_details_alert_action';
import { useCaseAlertActionItems } from '@kbn/response-ops-alerts-table/hooks/use_case_alert_action_items';
import { RULE_DETAILS_PAGE_ID } from '../../pages/rule_details/constants';
import { paths, SLO_DETAIL_PATH } from '../../../common/locators/paths';
import { parseAlert } from '../../pages/alerts/helpers/parse_alert';
import type { GetObservabilityAlertsTableProp, ObservabilityAlertsTableContext } from '../..';
import { observabilityFeatureId } from '../..';

const snoozeLabel = i18n.translate('xpack.responseOpsAlertsTable.actions.snooze', {
  defaultMessage: 'Snooze',
});

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
    http,
    cases,
    notifications: { toasts },
  } = services;
  const {
    basePath: { prepend },
  } = http;

  const isSLODetailsPage = useRouteMatch(SLO_DETAIL_PATH);

  const isInApp = Boolean(tableId === SLO_ALERTS_TABLE_ID && isSLODetailsPage);

  const [viewInAppUrl, setViewInAppUrl] = useState<string>();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { authorizedToCreateAnyRules } = useGetRuleTypesPermissions({
    filteredRuleTypes: [],
    http,
    toasts,
    context: AlertsQueryContext,
  });

  const isSecurityRule =
    props.alert[ALERT_RULE_TYPE_ID] &&
    isSiemRuleType(props.alert[ALERT_RULE_TYPE_ID].toString());

  const showModifyOption = authorizedToCreateAnyRules && !isSecurityRule;
  const { isMutedAlertsEnabled = true } = props;

  const parseObservabilityAlert = useMemo(
    () => parseAlert(observabilityRuleTypeRegistry),
    [observabilityRuleTypeRegistry]
  );

  const observabilityAlert = parseObservabilityAlert(alert);

  const closeActionsPopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const toggleActionsPopover = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);

  const caseAlertActionItems = useCaseAlertActionItems({
    alert,
    cases,
    refresh,
    onActionExecuted: closeActionsPopover,
    owner: [observabilityFeatureId],
  });

  useEffect(() => {
    const alertLink = observabilityAlert.link;
    if (!observabilityAlert.hasBasePath && prepend) {
      setViewInAppUrl(prepend(alertLink ?? ''));
    } else {
      setViewInAppUrl(alertLink);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewInAppUrl = useCallback(() => {
    const alertLink = observabilityAlert.link as unknown as string;
    if (!observabilityAlert.hasBasePath) {
      setViewInAppUrl(prepend(alertLink ?? ''));
    } else {
      setViewInAppUrl(alertLink);
    }
  }, [observabilityAlert.link, observabilityAlert.hasBasePath, prepend]);

  const actionProps = useMemo(
    () => ({
      ...props,
      onActionExecuted: closeActionsPopover,
      resolveRulePagePath: (ruleId: string, currentPageId: string) =>
        currentPageId !== RULE_DETAILS_PAGE_ID ? paths.observability.ruleDetails(ruleId) : null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props, closeActionsPopover]
  );

  const caseItemsAsDescriptors = useMemo(
    () =>
      caseAlertActionItems.map((item, index) => ({
        key: `case-${index}`,
        renderItem: () => item,
      })),
    [caseAlertActionItems]
  );

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 0,
        size: 's',
        items: [
          ...caseItemsAsDescriptors,
          ...(caseItemsAsDescriptors.length > 0
            ? [{ isSeparator: true as const, key: 'sep-cases-views' }]
            : []),
          {
            key: 'viewRuleDetails',
            renderItem: () => (
              <ViewRuleDetailsAlertAction<ObservabilityAlertsTableContext> {...actionProps} />
            ),
          },
          {
            key: 'viewAlertDetails',
            renderItem: () => (
              <ViewAlertDetailsAlertAction<ObservabilityAlertsTableContext> {...actionProps} />
            ),
          },
          ...(showModifyOption
            ? [
                { isSeparator: true as const, key: 'sep-views-actions' },
                {
                  key: 'snooze',
                  name: snoozeLabel,
                  'data-test-subj': 'snooze-alert',
                  panel: 1,
                },
                {
                  key: 'acknowledge',
                  renderItem: () => (
                    <AcknowledgeAlertAction<ObservabilityAlertsTableContext> {...actionProps} />
                  ),
                },
                {
                  key: 'markUntracked',
                  renderItem: () => (
                    <MarkAsUntrackedAlertAction<ObservabilityAlertsTableContext> {...actionProps} />
                  ),
                },
                ...(isMutedAlertsEnabled
                  ? [
                      {
                        key: 'mute',
                        renderItem: () => (
                          <MuteAlertAction<ObservabilityAlertsTableContext> {...actionProps} />
                        ),
                      },
                    ]
                  : []),
                {
                  key: 'editTags',
                  renderItem: () => (
                    <EditTagsAction<ObservabilityAlertsTableContext> {...actionProps} />
                  ),
                },
              ]
            : []),
        ],
      },
      {
        id: 1,
        title: snoozeLabel,
        width: 400,
        content: (
          <SnoozeNotificationsPopoverPanel onClose={closeActionsPopover} onSnooze={closeActionsPopover} />
        ),
      },
    ],
    [caseItemsAsDescriptors, actionProps, showModifyOption, isMutedAlertsEnabled, closeActionsPopover]
  );

  const actionsToolTip = i18n.translate('xpack.observability.alertsTable.moreActionsTextLabel', {
    defaultMessage: 'More actions',
  });

  const onExpandEvent = () => {
    onExpandedAlertIndexChange(rowIndex);
  };

  const hideViewInApp = isInApp || viewInAppUrl === '' || parentAlert;

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
          <EuiToolTip
            content={i18n.translate('xpack.observability.alertsTable.viewInAppTextLabel', {
              defaultMessage: 'View in app',
            })}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              data-test-subj="o11yAlertActionsButton"
              aria-label={i18n.translate('xpack.observability.alertsTable.viewInAppTextLabel', {
                defaultMessage: 'View in app',
              })}
              color="text"
              onMouseOver={handleViewInAppUrl}
              onClick={() => window.open(viewInAppUrl)}
              iconType="eye"
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
          panelPaddingSize="s"
        >
          <EuiContextMenu
            initialPanelId={0}
            panels={panels}
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
