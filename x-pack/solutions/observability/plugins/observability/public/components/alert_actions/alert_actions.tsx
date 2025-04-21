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
} from '@elastic/eui';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { CasesPublicStart } from '@kbn/cases-plugin/public';
import { useRouteMatch } from 'react-router-dom';
import { SLO_ALERTS_TABLE_ID } from '@kbn/observability-shared-plugin/common';
import { DefaultAlertActions } from '@kbn/response-ops-alerts-table/components/default_alert_actions';
import { useKibana } from '../../utils/kibana_react';
import { useCaseActions } from './use_case_actions';
import { RULE_DETAILS_PAGE_ID } from '../../pages/rule_details/constants';
import { paths, SLO_DETAIL_PATH } from '../../../common/locators/paths';
import { parseAlert } from '../../pages/alerts/helpers/parse_alert';
import {
  GetObservabilityAlertsTableProp,
  ObservabilityAlertsTableContext,
  observabilityFeatureId,
} from '../..';
import { ALERT_DETAILS_PAGE_ID } from '../../pages/alert_details/alert_details';

export const AlertActions: GetObservabilityAlertsTableProp<'renderActionsCell'> = ({
  observabilityRuleTypeRegistry,
  alert,
  tableId,
  refresh,
  openAlertInFlyout,
  parentAlert,
  ...rest
}) => {
  const services = useKibana().services;
  const {
    http: {
      basePath: { prepend },
    },
  } = services;
  const {
    helpers: { canUseCases },
  } = services.cases! as unknown as CasesPublicStart; // Cases is guaranteed to be defined in Observability
  const isSLODetailsPage = useRouteMatch(SLO_DETAIL_PATH);

  const isInApp = Boolean(tableId === SLO_ALERTS_TABLE_ID && isSLODetailsPage);

  const userCasesPermissions = canUseCases([observabilityFeatureId]);
  const [viewInAppUrl, setViewInAppUrl] = useState<string>();

  const parseObservabilityAlert = useMemo(
    () => parseAlert(observabilityRuleTypeRegistry),
    [observabilityRuleTypeRegistry]
  );

  const observabilityAlert = parseObservabilityAlert(alert);

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

  const { isPopoverOpen, setIsPopoverOpen, handleAddToExistingCaseClick, handleAddToNewCaseClick } =
    useCaseActions({
      refresh,
      alerts: [alert],
    });

  const closeActionsPopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  const toggleActionsPopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const actionsMenuItems = [
    ...(userCasesPermissions.createComment && userCasesPermissions.read
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
          observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
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
          tableId={tableId}
          refresh={refresh}
          alert={alert}
          openAlertInFlyout={openAlertInFlyout}
          {...rest}
        />
      ),
      [
        alert,
        closeActionsPopover,
        observabilityRuleTypeRegistry,
        openAlertInFlyout,
        refresh,
        rest,
        tableId,
      ]
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

  const hideViewInApp = isInApp || viewInAppUrl === '' || parentAlert;

  return (
    <>
      {!hideViewInApp && (
        <EuiFlexItem>
          <EuiToolTip
            content={i18n.translate('xpack.observability.alertsTable.viewInAppTextLabel', {
              defaultMessage: 'View in app',
            })}
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
            <EuiToolTip content={actionsToolTip}>
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
};

// Default export used for lazy loading
// eslint-disable-next-line import/no-default-export
export default AlertActions;

export type AlertActions = typeof AlertActions;
