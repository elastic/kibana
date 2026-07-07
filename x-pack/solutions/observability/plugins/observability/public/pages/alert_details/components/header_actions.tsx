/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { noop } from 'lodash';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { AlertStatus } from '@kbn/rule-data-utils';
import {
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { RuleQueryInspector } from '@kbn/triggers-actions-ui-plugin/public';
import { AlertSnoozePanelInline, useAlertSnooze } from '@kbn/response-ops-alert-snooze';
import type { AlertSnoozePayload } from '@kbn/response-ops-alert-snooze';

import { useKibana } from '../../../utils/kibana_react';
import type { TopAlert } from '../../../typings/alerts';
import { useAuthorizedToReadRuleType } from '../../../hooks/use_authorized_to_read_rule_type';
import { observabilityFeatureId } from '../../../../common';
import { paths } from '../../../../common/locators/paths';
import { useBulkUntrackAlerts } from '../hooks/use_bulk_untrack_alerts';
import { useAlertSnoozeState } from '../hooks/use_alert_snooze_state';
import {
  AlertDetailsRuleFormFlyout,
  type AlertDetailsRuleFormFlyoutBaseProps,
} from './alert_details_rule_form_flyout';
import { ObsCasesContext } from './obs_cases_context';
import { AddToCaseButton } from './add_to_case_button';
import { useDiscoverUrl } from '../hooks/use_discover_url/use_discover_url';
import { ALERT_DETAILS_EBT_ELEMENTS } from '../ebt_constants';

export interface HeaderActionsProps extends AlertDetailsRuleFormFlyoutBaseProps {
  alert: TopAlert | null;
  alertIndex?: string;
  alertStatus?: AlertStatus;
  onUntrackAlert: () => void;
}

export function HeaderActions({
  alert,
  alertIndex,
  alertStatus,
  onUntrackAlert,
  onUpdate,
  rule,
  refetch,
}: HeaderActionsProps) {
  const { services } = useKibana();
  const {
    cases,
    triggersActionsUi: { getRuleSnoozeModal: RuleSnoozeModal },
    http,
    notifications,
  } = services;

  const { authorizedToReadRuleType } = useAuthorizedToReadRuleType();

  const canReadAlertRule = authorizedToReadRuleType(
    alert?.fields[ALERT_RULE_TYPE_ID],
    alert?.fields[ALERT_RULE_CONSUMER]
  );

  // Attaching an alert to a case requires both reading cases and adding comments
  // to them, so gate the "Add to case" button on those case privileges rather
  // than merely on the cases plugin being present.
  const casesPermissions = cases?.helpers.canUseCases([observabilityFeatureId]);
  const canAddToCase = Boolean(casesPermissions?.read && casesPermissions?.createComment);

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [isRuleSnoozeModalOpen, setRuleSnoozeModalOpen] = useState<boolean>(false);
  const [isAlertSnoozeFormOpen, setIsAlertSnoozeFormOpen] = useState<boolean>(false);

  const { mutateAsync: untrackAlerts } = useBulkUntrackAlerts();

  const {
    ruleId,
    instanceId,
    isMuted,
    isSnoozed,
    refetch: refetchSnoozeState,
  } = useAlertSnoozeState(alert);

  const { snoozeAlert, unsnoozeAlert } = useAlertSnooze({
    http,
    notifications,
    ruleId,
    instanceId,
    isMuted,
    isSnoozed,
    onSuccess: refetchSnoozeState,
    skipAlertsQueryContext: true,
  });

  const handleSnoozeAlertApply = useCallback(
    async (payload: AlertSnoozePayload) => {
      const applied = await snoozeAlert(payload);
      if (applied) {
        setIsAlertSnoozeFormOpen(false);
        setIsPopoverOpen(false);
      }
    },
    [snoozeAlert]
  );

  const handleUnsnoozeAlert = useCallback(async () => {
    const done = await unsnoozeAlert();
    if (done) {
      setIsPopoverOpen(false);
    }
  }, [unsnoozeAlert]);

  const { discoverUrl } = useDiscoverUrl({ alert, rule });

  const handleUntrackAlert = useCallback(async () => {
    if (alert) {
      await untrackAlerts({
        indices: ['.internal.alerts-observability.*'],
        alertUuids: [alert.fields[ALERT_UUID]],
      });
      onUntrackAlert();
    }
  }, [alert, untrackAlerts, onUntrackAlert]);

  const [alertDetailsRuleFormFlyoutOpen, setAlertDetailsRuleFormFlyoutOpen] = useState(false);

  const handleTogglePopover = () => setIsPopoverOpen(!isPopoverOpen);
  const handleClosePopover = () => {
    setIsPopoverOpen(false);
    setIsAlertSnoozeFormOpen(false);
  };

  const handleOpenSnoozeModal = () => {
    setIsPopoverOpen(false);
    setRuleSnoozeModalOpen(true);
  };

  return (
    <>
      <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
        {alert?.fields[ALERT_RULE_UUID] && alert?.fields[ALERT_RULE_TYPE_ID] && (
          <EuiFlexItem grow={false}>
            <RuleQueryInspector
              ruleId={alert.fields[ALERT_RULE_UUID]}
              ruleTypeId={alert.fields[ALERT_RULE_TYPE_ID]}
              alertId={alert.fields[ALERT_UUID]}
            />
          </EuiFlexItem>
        )}
        {discoverUrl && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={discoverUrl}
              iconType="discoverApp"
              target="_blank"
              data-test-subj={`alertDetailsPage_viewInDiscover${rule ? `_${rule.ruleTypeId}` : ''}`}
              {...getEbtProps({
                action: EBT_CLICK_ACTIONS.OPEN_IN_DISCOVER,
                element: ALERT_DETAILS_EBT_ELEMENTS.HEADER,
                detail: rule?.ruleTypeId,
              })}
            >
              <EuiText size="s">
                {i18n.translate('xpack.observability.alertDetails.viewInDiscover', {
                  defaultMessage: 'View in Discover',
                })}
              </EuiText>
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}

        {cases && canAddToCase && (
          <EuiFlexItem grow={false}>
            <ObsCasesContext>
              <AddToCaseButton
                alert={alert}
                alertIndex={alertIndex}
                rule={rule}
                setIsPopoverOpen={setIsPopoverOpen}
              />
            </ObsCasesContext>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiPopover
            panelPaddingSize="none"
            isOpen={isPopoverOpen}
            closePopover={handleClosePopover}
            panelStyle={
              isAlertSnoozeFormOpen ? { maxHeight: '50vh', overflowY: 'auto' } : undefined
            }
            aria-label={i18n.translate('xpack.observability.alertDetails.actionsButtonLabel', {
              defaultMessage: 'Actions',
            })}
            button={
              <EuiToolTip
                content={i18n.translate('xpack.observability.alertDetails.actionsButtonLabel', {
                  defaultMessage: 'Actions',
                })}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  display="base"
                  size="m"
                  iconType="boxesVertical"
                  data-test-subj="alert-details-header-actions-menu-button"
                  onClick={handleTogglePopover}
                  aria-label={i18n.translate(
                    'xpack.observability.alertDetails.actionsButtonLabel',
                    {
                      defaultMessage: 'Actions',
                    }
                  )}
                />
              </EuiToolTip>
            }
          >
            {isAlertSnoozeFormOpen ? (
              <EuiContextMenuPanel>
                <AlertSnoozePanelInline
                  onApply={handleSnoozeAlertApply}
                  onBack={() => setIsAlertSnoozeFormOpen(false)}
                />
              </EuiContextMenuPanel>
            ) : (
              <EuiContextMenuPanel>
                <div style={{ width: '220px' }}>
                  <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
                    <div />

                    <EuiButtonEmpty
                      size="s"
                      color="text"
                      iconType="bellSlash"
                      onClick={handleOpenSnoozeModal}
                      disabled={!alert?.fields[ALERT_RULE_UUID] || !rule}
                      data-test-subj="snooze-rule-button"
                    >
                      <EuiText size="s">
                        {i18n.translate('xpack.observability.alertDetails.editSnoozeRule', {
                          defaultMessage: 'Snooze the rule',
                        })}
                      </EuiText>
                    </EuiButtonEmpty>

                    <SnoozeAlertAction
                      ruleId={ruleId}
                      instanceId={instanceId}
                      isMuted={isMuted}
                      isSnoozed={isSnoozed}
                      onUnsnooze={handleUnsnoozeAlert}
                      onSnooze={() => setIsAlertSnoozeFormOpen(true)}
                    />

                    <EuiButtonEmpty
                      size="s"
                      color="text"
                      iconType="pencil"
                      onClick={() => {
                        setIsPopoverOpen(false);
                        setAlertDetailsRuleFormFlyoutOpen(true);
                      }}
                      disabled={!alert?.fields[ALERT_RULE_UUID] || !rule}
                      data-test-subj="edit-rule-button"
                    >
                      <EuiText size="s">
                        {i18n.translate('xpack.observability.alertDetails.editRule', {
                          defaultMessage: 'Edit rule',
                        })}
                      </EuiText>
                    </EuiButtonEmpty>

                    <EuiButtonEmpty
                      size="s"
                      color="text"
                      iconType="eyeSlash"
                      onClick={handleUntrackAlert}
                      data-test-subj="untrack-alert-button"
                      disabled={alertStatus !== ALERT_STATUS_ACTIVE}
                    >
                      <EuiText size="s">
                        {i18n.translate('xpack.observability.alertDetails.untrackAlert', {
                          defaultMessage: 'Mark as untracked',
                        })}
                      </EuiText>
                    </EuiButtonEmpty>

                    {canReadAlertRule && (
                      <>
                        <EuiHorizontalRule margin="none" />

                        <EuiButtonEmpty
                          size="s"
                          color="text"
                          iconType="link"
                          disabled={!alert?.fields[ALERT_RULE_UUID] || !rule}
                          data-test-subj="view-rule-details-button"
                          href={
                            rule
                              ? http.basePath.prepend(paths.observability.ruleDetails(rule.id))
                              : ''
                          }
                          target="_blank"
                        >
                          <EuiText size="s">
                            {i18n.translate('xpack.observability.alertDetails.viewRuleDetails', {
                              defaultMessage: 'Go to rule details',
                            })}
                          </EuiText>
                        </EuiButtonEmpty>
                      </>
                    )}

                    <div />
                  </EuiFlexGroup>
                </div>
              </EuiContextMenuPanel>
            )}
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
      {rule && (
        <AlertDetailsRuleFormFlyout
          isRuleFormFlyoutOpen={alertDetailsRuleFormFlyoutOpen}
          setIsRuleFormFlyoutOpen={setAlertDetailsRuleFormFlyoutOpen}
          onUpdate={onUpdate}
          refetch={refetch}
          rule={rule}
        />
      )}

      {rule && isRuleSnoozeModalOpen ? (
        <RuleSnoozeModal
          rule={rule}
          onClose={() => setRuleSnoozeModalOpen(false)}
          onRuleChanged={async () => {
            refetch();
          }}
          onLoading={noop}
        />
      ) : null}
    </>
  );
}

function SnoozeAlertAction({
  ruleId,
  instanceId,
  isMuted,
  isSnoozed,
  onUnsnooze,
  onSnooze,
}: {
  ruleId?: string;
  instanceId?: string;
  isMuted: boolean;
  isSnoozed: boolean;
  onUnsnooze: () => void;
  onSnooze: () => void;
}) {
  if (!ruleId || !instanceId) return null;

  if (isMuted || isSnoozed) {
    return (
      <EuiButtonEmpty
        size="s"
        color="text"
        iconType="bell"
        onClick={onUnsnooze}
        data-test-subj="unsnooze-alert-button"
      >
        <EuiText size="s">
          {i18n.translate('xpack.observability.alertDetails.unsnoozeAlert', {
            defaultMessage: 'Unsnooze the alert',
          })}
        </EuiText>
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiButtonEmpty
      size="s"
      color="text"
      iconType="bellSlash"
      onClick={onSnooze}
      data-test-subj="snooze-alert-button"
    >
      <EuiText size="s">
        {i18n.translate('xpack.observability.alertDetails.snoozeAlert', {
          defaultMessage: 'Snooze the alert',
        })}
      </EuiText>
    </EuiButtonEmpty>
  );
}
