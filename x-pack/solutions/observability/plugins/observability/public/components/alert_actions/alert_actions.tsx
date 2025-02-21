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
import { CaseAttachmentsWithoutOwner, CasesPublicStart } from '@kbn/cases-plugin/public';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useRouteMatch } from 'react-router-dom';
import { SLO_ALERTS_TABLE_ID } from '@kbn/observability-shared-plugin/common';
import { DefaultAlertActions } from '@kbn/response-ops-alerts-table/components/default_alert_actions';
import { useAlertsTableContext } from '@kbn/response-ops-alerts-table/contexts/alerts_table_context';
import type { EventNonEcsData } from '../../../common/typings';
import { GetObservabilityAlertsTableProp } from '../alerts_table/types';
import { RULE_DETAILS_PAGE_ID } from '../../pages/rule_details/constants';
import { paths, SLO_DETAIL_PATH } from '../../../common/locators/paths';
import { parseAlert } from '../../pages/alerts/helpers/parse_alert';
import { observabilityFeatureId } from '../..';
import { ALERT_DETAILS_PAGE_ID } from '../../pages/alert_details/alert_details';

// eslint-disable-next-line react/function-component-definition
export const AlertActions: GetObservabilityAlertsTableProp<'renderActionsCell'> = ({
  config,
  observabilityRuleTypeRegistry,
  alert,
  id,
  tableId,
  dataGridRef,
  refresh,
  isLoading,
  isLoadingAlerts,
  alerts,
  oldAlertsData,
  ecsAlertsData,
  alertsCount,
  browserFields,
  isLoadingMutedAlerts,
  mutedAlerts,
  isLoadingCases,
  cases,
  isLoadingMaintenanceWindows,
  maintenanceWindows,
  pageIndex,
  pageSize,
  openAlertInFlyout,
  showAlertStatusWithFlapping,
  bulkActionsStore,
  columns,
  renderCellValue,
  renderCellPopover,
  renderActionsCell,
  renderFlyoutHeader,
  renderFlyoutBody,
  renderFlyoutFooter,
}) => {
  const { services } = useAlertsTableContext();
  const {
    http: {
      basePath: { prepend },
    },
  } = services;
  const {
    helpers: { getRuleIdFromEvent, canUseCases },
    hooks: { useCasesAddToNewCaseFlyout, useCasesAddToExistingCaseModal },
  } = services.cases! as unknown as CasesPublicStart; // Cases is guaranteed to be defined in Observability
  const isSLODetailsPage = useRouteMatch(SLO_DETAIL_PATH);

  const isInApp = Boolean(id === SLO_ALERTS_TABLE_ID && isSLODetailsPage);
  const data = useMemo(
    () =>
      Object.entries(alert ?? {}).reduce<EventNonEcsData[]>(
        (acc, [field, value]) => [...acc, { field, value: value as string[] }],
        []
      ),
    [alert]
  );

  const ecsData = useMemo<Ecs>(
    () => ({
      _id: alert._id,
      _index: alert._index,
    }),
    [alert._id, alert._index]
  );
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

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const caseAttachments: CaseAttachmentsWithoutOwner = useMemo(() => {
    return ecsData?._id
      ? [
          {
            alertId: ecsData?._id ?? '',
            index: ecsData?._index ?? '',
            type: AttachmentType.alert,
            rule: getRuleIdFromEvent({ ecs: ecsData, data: data ?? [] }),
          },
        ]
      : [];
  }, [ecsData, getRuleIdFromEvent, data]);

  const onSuccess = useCallback(() => {
    refresh();
  }, [refresh]);

  const createCaseFlyout = useCasesAddToNewCaseFlyout({ onSuccess });
  const selectCaseModal = useCasesAddToExistingCaseModal({ onSuccess });

  const closeActionsPopover = () => {
    setIsPopoverOpen(false);
  };

  const toggleActionsPopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const handleAddToNewCaseClick = () => {
    createCaseFlyout.open({ attachments: caseAttachments });
    closeActionsPopover();
  };

  const handleAddToExistingCaseClick = () => {
    selectCaseModal.open({ getAttachments: () => caseAttachments });
    closeActionsPopover();
  };

  const defaultRowActions = useMemo(
    () => (
      <DefaultAlertActions
        key="defaultRowActions"
        onActionExecuted={closeActionsPopover}
        isAlertDetailsEnabled={true}
        resolveRulePagePath={(ruleId, currentPageId) =>
          currentPageId !== RULE_DETAILS_PAGE_ID ? paths.observability.ruleDetails(ruleId) : null
        }
        resolveAlertPagePath={(alertId, currentPageId) =>
          currentPageId !== ALERT_DETAILS_PAGE_ID ? paths.observability.alertDetails(alertId) : null
        }
        tableId={tableId}
        dataGridRef={dataGridRef}
        refresh={refresh}
        isLoading={isLoading}
        isLoadingAlerts={isLoadingAlerts}
        alert={alert}
        alerts={alerts}
        oldAlertsData={oldAlertsData}
        ecsAlertsData={ecsAlertsData}
        alertsCount={alertsCount}
        browserFields={browserFields}
        isLoadingMutedAlerts={isLoadingMutedAlerts}
        mutedAlerts={mutedAlerts}
        isLoadingCases={isLoadingCases}
        cases={cases}
        isLoadingMaintenanceWindows={isLoadingMaintenanceWindows}
        maintenanceWindows={maintenanceWindows}
        pageIndex={pageIndex}
        pageSize={pageSize}
        openAlertInFlyout={openAlertInFlyout}
        showAlertStatusWithFlapping={showAlertStatusWithFlapping}
        bulkActionsStore={bulkActionsStore}
        columns={columns}
        renderCellValue={renderCellValue}
        renderCellPopover={renderCellPopover}
        renderActionsCell={renderActionsCell}
        renderFlyoutHeader={renderFlyoutHeader}
        renderFlyoutBody={renderFlyoutBody}
        renderFlyoutFooter={renderFlyoutFooter}
        services={services}
        config={config}
        observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
      />
    ),
    [
      alert,
      alerts,
      alertsCount,
      browserFields,
      bulkActionsStore,
      cases,
      columns,
      config,
      dataGridRef,
      ecsAlertsData,
      isLoading,
      isLoadingAlerts,
      isLoadingCases,
      isLoadingMaintenanceWindows,
      isLoadingMutedAlerts,
      maintenanceWindows,
      mutedAlerts,
      observabilityRuleTypeRegistry,
      oldAlertsData,
      openAlertInFlyout,
      pageIndex,
      pageSize,
      refresh,
      renderActionsCell,
      renderCellPopover,
      renderCellValue,
      renderFlyoutBody,
      renderFlyoutFooter,
      renderFlyoutHeader,
      services,
      showAlertStatusWithFlapping,
      tableId,
    ]
  );

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
    defaultRowActions,
  ];

  const actionsToolTip =
    actionsMenuItems.length <= 0
      ? i18n.translate('xpack.observability.alertsTable.notEnoughPermissions', {
          defaultMessage: 'Additional privileges required',
        })
      : i18n.translate('xpack.observability.alertsTable.moreActionsTextLabel', {
          defaultMessage: 'More actions',
        });

  return (
    <>
      {viewInAppUrl !== '' && !isInApp ? (
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
      ) : null}

      <EuiFlexItem
        css={{
          textAlign: 'center',
        }}
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
