/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useRouteMatch } from 'react-router-dom';
import { SLO_ALERTS_TABLE_ID } from '@kbn/observability-shared-plugin/common';
import {
  ALERT_FLAPPING,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_VALUES,
  ALERT_GROUP,
  ALERT_GROUPING,
  ALERT_INDEX_PATTERN,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_URL,
  ALERT_UUID,
  TIMESTAMP,
  getRulesAppDetailsRoute,
  rulesAppRoute,
} from '@kbn/rule-data-utils';
import { DefaultAlertActions } from '@kbn/response-ops-alerts-table/components/default_alert_actions';
import { useCaseAlertActionItems } from '@kbn/response-ops-alerts-table/hooks/use_case_alert_action_items';
import { ExpandableContextMenuPanel } from '@kbn/response-ops-alerts-table/components/expandable_context_menu_panel';
import { useKibana } from '../../utils/kibana_react';
import { useCanModifyAlerts } from '../../hooks/use_can_modify_alerts';
import { useAuthorizedToReadRuleType } from '../../hooks/use_authorized_to_read_rule_type';
import { RULE_DETAILS_PAGE_ID } from '../../pages/rule_details/constants';
import { SLO_DETAIL_PATH } from '../../../common/locators/paths';
import { parseAlert } from '../../pages/alerts/helpers/parse_alert';
import type { GetObservabilityAlertsTableProp, ObservabilityAlertsTableContext } from '../..';
import { observabilityFeatureId } from '../..';

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

  const canModifyAlerts = useCanModifyAlerts();

  const { authorizedToReadRuleForAlert } = useAuthorizedToReadRuleType();

  const canReadAlertRule = authorizedToReadRuleForAlert(alert);
  const { application, telemetryClient, nightshiftInvestigations } = useKibana().services;
  const isSLODetailsPage = useRouteMatch(SLO_DETAIL_PATH);

  const isInApp = Boolean(tableId === SLO_ALERTS_TABLE_ID && isSLODetailsPage);

  const [viewInAppUrl, setViewInAppUrl] = useState<string>();

  const parseObservabilityAlert = useMemo(
    () => parseAlert(observabilityRuleTypeRegistry),
    [observabilityRuleTypeRegistry]
  );

  const observabilityAlert = parseObservabilityAlert(alert);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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
    onAddToCase({ isNewCase }) {
      telemetryClient.reportAlertAddedToCase(
        isNewCase,
        tableId || 'unknown',
        observabilityAlert.fields['kibana.alert.rule.rule_type_id']
      );
      refresh?.();
    },
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

  const [isInvestigating, setIsInvestigating] = useState(false);
  const fields = observabilityAlert.fields;
  const start = fields[ALERT_START] ?? fields[TIMESTAMP];
  const alertSnapshot =
    fields[ALERT_UUID] &&
    fields[ALERT_RULE_UUID] &&
    fields[ALERT_RULE_NAME] &&
    fields[ALERT_RULE_TYPE_ID] &&
    fields[ALERT_RULE_CATEGORY] &&
    observabilityAlert.reason &&
    fields[ALERT_STATUS] &&
    start &&
    typeof fields[ALERT_FLAPPING] === 'boolean'
      ? {
          id: fields[ALERT_UUID],
          rule_id: fields[ALERT_RULE_UUID],
          rule_name: fields[ALERT_RULE_NAME],
          rule_type_id: fields[ALERT_RULE_TYPE_ID],
          rule_category: fields[ALERT_RULE_CATEGORY],
          reason: observabilityAlert.reason,
          status: fields[ALERT_STATUS],
          start,
          flapping: fields[ALERT_FLAPPING],
          ...(fields[ALERT_URL] ? { url: fields[ALERT_URL] } : {}),
          ...(fields[ALERT_RULE_TAGS] ? { rule_tags: fields[ALERT_RULE_TAGS] } : {}),
          ...(fields[ALERT_GROUPING] ? { grouping: fields[ALERT_GROUPING] } : {}),
          ...(fields[ALERT_GROUP] ? { group: fields[ALERT_GROUP] } : {}),
          ...(fields[ALERT_EVALUATION_VALUES] !== undefined ||
          fields[ALERT_EVALUATION_VALUE] !== undefined ||
          fields[ALERT_EVALUATION_THRESHOLD] !== undefined
            ? {
                evaluation: {
                  value: fields[ALERT_EVALUATION_VALUES] ?? fields[ALERT_EVALUATION_VALUE],
                  threshold: fields[ALERT_EVALUATION_THRESHOLD],
                },
              }
            : {}),
          ...(fields[ALERT_RULE_PARAMETERS]
            ? { rule_parameters: fields[ALERT_RULE_PARAMETERS] }
            : {}),
          ...(fields[ALERT_INDEX_PATTERN] ? { index_pattern: fields[ALERT_INDEX_PATTERN] } : {}),
        }
      : undefined;
  const showInvestigateAction = Boolean(
    nightshiftInvestigations &&
      application.capabilities.agentBuilder?.write === true &&
      alertSnapshot
  );

  const handleInvestigate = async () => {
    if (!nightshiftInvestigations || !alertSnapshot) return;

    setIsInvestigating(true);
    closeActionsPopover();

    try {
      await nightshiftInvestigations.investigationsClient.fetch(
        'POST /internal/nightshift/investigations',
        {
          params: {
            body: {
              subject: { type: 'alert', id: alertSnapshot.id },
              concurrency_key: alertSnapshot.id,
              context: {
                alerts: [alertSnapshot],
              },
            },
          },
          signal: null,
        }
      );
      services.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.observability.alertsTable.investigateSuccessTitle', {
          defaultMessage: 'Investigation started',
        }),
      });
    } catch (error) {
      services.notifications.toasts.addDanger({
        title: i18n.translate('xpack.observability.alertsTable.investigateErrorTitle', {
          defaultMessage: 'Failed to start investigation',
        }),
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsInvestigating(false);
    }
  };

  const actionsMenuItems = [
    ...(showInvestigateAction
      ? [
          <EuiContextMenuItem
            key="investigate"
            icon="inspect"
            disabled={isInvestigating}
            onClick={handleInvestigate}
            data-test-subj="o11yAlertActionsInvestigate"
          >
            {i18n.translate('xpack.observability.alertsTable.investigateTextLabel', {
              defaultMessage: 'Investigate',
            })}
          </EuiContextMenuItem>,
        ]
      : []),
    ...caseAlertActionItems,

    useMemo(
      () => (
        <DefaultAlertActions<ObservabilityAlertsTableContext>
          {...props}
          key="defaultRowActions"
          onActionExecuted={closeActionsPopover}
          canModifyAlerts={canModifyAlerts}
          resolveRulePagePath={(ruleId, currentPageId) =>
            canReadAlertRule && currentPageId !== RULE_DETAILS_PAGE_ID
              ? `${rulesAppRoute}${getRulesAppDetailsRoute(ruleId)}`
              : null
          }
        />
      ),
      [closeActionsPopover, props, canModifyAlerts, canReadAlertRule]
    ),
  ];

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
              iconType="maximize"
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
          aria-label={actionsToolTip}
          anchorPosition="rightCenter"
          button={
            <EuiToolTip content={actionsToolTip} disableScreenReaderOutput>
              <EuiButtonIcon
                aria-label={actionsToolTip}
                color="text"
                data-test-subj="alertsTableRowActionMore"
                display="empty"
                iconType="boxesVertical"
                onClick={toggleActionsPopover}
                size="s"
              />
            </EuiToolTip>
          }
          closePopover={closeActionsPopover}
          isOpen={isPopoverOpen}
          panelPaddingSize="none"
          panelStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
        >
          <ExpandableContextMenuPanel items={actionsMenuItems} />
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
