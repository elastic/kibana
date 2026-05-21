/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
} from '@elastic/eui';
import type { AlertStatus } from '@kbn/rule-data-utils';
import {
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import { loadRuleQueryInspector } from '@kbn/triggers-actions-ui-plugin/public';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public/types';
import { OBSERVABILITY_ALERT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

import { useKibana } from '../../../utils/kibana_react';
import type { TopAlert } from '../../../typings/alerts';
import type { Rule } from '@kbn/alerts-ui-shared';
import { paths } from '../../../../common/locators/paths';
import { useBulkUntrackAlerts } from '../hooks/use_bulk_untrack_alerts';
import {
  AlertDetailsRuleFormFlyout,
  type AlertDetailsRuleFormFlyoutBaseProps,
} from './alert_details_rule_form_flyout';
import { ObsCasesContext } from './obs_cases_context';
import { useDiscoverUrl } from '../hooks/use_discover_url/use_discover_url';

// Child component rendered inside ObsCasesContext so the cases hook runs within the correct context
function AddToCaseContextMenuItem({
  alert,
  alertIndex,
  rule,
  closePopover,
}: {
  alert: TopAlert | null;
  alertIndex?: string;
  rule?: Rule;
  closePopover: () => void;
}) {
  const {
    services: { cases, telemetryClient },
  } = useKibana();

  const selectCaseModal = cases?.hooks.useCasesAddToExistingCaseModal({
    onSuccess: ({ updatedAt }) => {
      telemetryClient.reportAlertAddedToCase(
        !updatedAt,
        'alertDetails.addToCaseBtn',
        rule?.ruleTypeId || 'unknown'
      );
    },
  });

  const attachments: CaseAttachmentsWithoutOwner = useMemo(
    () =>
      alert && rule
        ? [
            {
              type: OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
              attachmentId: alert.fields[ALERT_UUID] || '',
              metadata: {
                index: alertIndex || '',
                rule: {
                  id: rule.id,
                  name: rule.name,
                },
              },
            },
          ]
        : [],
    [alert, alertIndex, rule]
  );

  const handleClick = useCallback(() => {
    closePopover();
    selectCaseModal?.open({ getAttachments: () => attachments });
  }, [attachments, closePopover, selectCaseModal]);

  return (
    <EuiContextMenuItem
      icon="plus"
      onClick={handleClick}
      data-test-subj={`add-to-cases-button-${rule?.ruleTypeId}`}
    >
      {i18n.translate('xpack.observability.alertDetails.addToCase', {
        defaultMessage: 'Add to case',
      })}
    </EuiContextMenuItem>
  );
}

const INSPECT_SUPPORTED_RULE_TYPES = new Set([OBSERVABILITY_THRESHOLD_RULE_TYPE_ID]);

const INSPECT_TITLE = i18n.translate('xpack.observability.alertDetails.inspectTitle', {
  defaultMessage: 'Inspect',
});

const INSPECT_ERROR_TITLE = i18n.translate('xpack.observability.alertDetails.inspectErrorTitle', {
  defaultMessage: 'Unable to load query',
});

function InspectRuleQueryMenuItem({
  ruleId,
  ruleTypeId,
  alertId,
  closePopover,
}: {
  ruleId: string;
  ruleTypeId: string;
  alertId?: string;
  closePopover: () => void;
}) {
  const {
    services: { http, inspector, notifications },
  } = useKibana();
  const [isLoading, setIsLoading] = useState(false);

  const handleInspect = useCallback(async () => {
    if (!inspector) return;

    closePopover();
    setIsLoading(true);
    try {
      const result = await loadRuleQueryInspector({ http, ruleId, mode: 'execute', alertId });
      const adapter = new RequestAdapter();
      for (const query of result.queries) {
        const name = query.label ?? query.index ?? 'Query';
        const req = adapter.start(name);
        req.json(query.request);
        if (query.response) {
          req.ok({ json: query.response });
        }
      }
      inspector.open({ requests: adapter }, { title: INSPECT_TITLE });
    } catch (e) {
      notifications.toasts.addError(e instanceof Error ? e : new Error(String(e)), {
        title: INSPECT_ERROR_TITLE,
      });
    } finally {
      setIsLoading(false);
    }
  }, [http, inspector, notifications, ruleId, alertId, closePopover]);

  if (!INSPECT_SUPPORTED_RULE_TYPES.has(ruleTypeId) || !inspector) {
    return null;
  }

  return (
    <EuiContextMenuItem
      icon="inspect"
      onClick={handleInspect}
      disabled={isLoading}
      data-test-subj="ruleQueryInspectorButton"
    >
      {i18n.translate('xpack.observability.alertDetails.inspect', {
        defaultMessage: 'Inspect',
      })}
    </EuiContextMenuItem>
  );
}

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
  } = services;

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [snoozeModalOpen, setSnoozeModalOpen] = useState<boolean>(false);
  const [alertDetailsRuleFormFlyoutOpen, setAlertDetailsRuleFormFlyoutOpen] = useState(false);

  const { mutateAsync: untrackAlerts } = useBulkUntrackAlerts();
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

  const handleTogglePopover = () => setIsPopoverOpen(!isPopoverOpen);
  const handleClosePopover = () => setIsPopoverOpen(false);

  const handleOpenSnoozeModal = () => {
    setIsPopoverOpen(false);
    setSnoozeModalOpen(true);
  };

  const ruleActionsDisabled = !alert?.fields[ALERT_RULE_UUID] || !rule;

  return (
    <ObsCasesContext>
      <>
        <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiPopover
              panelPaddingSize="none"
              isOpen={isPopoverOpen}
              closePopover={handleClosePopover}
              anchorPosition="downRight"
              button={
                <EuiButton
                  fill
                  iconType="arrowDown"
                  iconSide="right"
                  onClick={handleTogglePopover}
                  data-test-subj="alert-details-header-actions-menu-button"
                >
                  {i18n.translate('xpack.observability.alertDetails.actionsButtonLabel', {
                    defaultMessage: 'Actions',
                  })}
                </EuiButton>
              }
            >
              <EuiContextMenuPanel>
                {cases && (
                  <AddToCaseContextMenuItem
                    alert={alert}
                    alertIndex={alertIndex}
                    rule={rule}
                    closePopover={handleClosePopover}
                  />
                )}
                {discoverUrl && <EuiHorizontalRule margin="none" />}
                {discoverUrl && (
                  <EuiContextMenuItem
                    icon="discoverApp"
                    href={discoverUrl}                    
                    data-test-subj={`alertDetailsPage_viewInDiscover${
                      rule ? `_${rule.ruleTypeId}` : ''
                    }`}
                  >
                    {i18n.translate('xpack.observability.alertDetails.viewInDiscover', {
                      defaultMessage: 'View in Discover',
                    })}
                  </EuiContextMenuItem>
                )}
                <EuiHorizontalRule margin="none" />
                <EuiContextMenuItem
                  icon="bellSlash"
                  onClick={handleOpenSnoozeModal}
                  disabled={ruleActionsDisabled}
                  data-test-subj="snooze-rule-button"
                >
                  {i18n.translate('xpack.observability.alertDetails.editSnoozeRule', {
                    defaultMessage: 'Snooze the rule',
                  })}
                </EuiContextMenuItem>
                <EuiContextMenuItem
                  icon="pencil"
                  onClick={() => {
                    setIsPopoverOpen(false);
                    setAlertDetailsRuleFormFlyoutOpen(true);
                  }}
                  disabled={ruleActionsDisabled}
                  data-test-subj="edit-rule-button"
                >
                  {i18n.translate('xpack.observability.alertDetails.editRule', {
                    defaultMessage: 'Edit rule',
                  })}
                </EuiContextMenuItem>
                <EuiContextMenuItem
                  icon="eyeSlash"
                  onClick={() => {
                    setIsPopoverOpen(false);
                    handleUntrackAlert();
                  }}
                  disabled={alertStatus !== ALERT_STATUS_ACTIVE}
                  data-test-subj="untrack-alert-button"
                >
                  {i18n.translate('xpack.observability.alertDetails.untrackAlert', {
                    defaultMessage: 'Mark as untracked',
                  })}
                </EuiContextMenuItem>
                <EuiHorizontalRule margin="none" />
                {alert?.fields[ALERT_RULE_UUID] && alert?.fields[ALERT_RULE_TYPE_ID] && (
                  <InspectRuleQueryMenuItem
                    ruleId={alert.fields[ALERT_RULE_UUID]}
                    ruleTypeId={alert.fields[ALERT_RULE_TYPE_ID]}
                    alertId={alert.fields[ALERT_UUID]}
                    closePopover={handleClosePopover}
                  />
                )}
                <EuiHorizontalRule margin="none" />
                <EuiContextMenuItem
                  icon="link"
                  href={
                    rule ? http.basePath.prepend(paths.observability.ruleDetails(rule.id)) : ''
                  }                  
                  disabled={ruleActionsDisabled}
                  data-test-subj="view-rule-details-button"
                >
                  {i18n.translate('xpack.observability.alertDetails.viewRuleDetails', {
                    defaultMessage: 'Go to rule details',
                  })}
                </EuiContextMenuItem>
              </EuiContextMenuPanel>
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
        {rule && snoozeModalOpen ? (
          <RuleSnoozeModal
            rule={rule}
            onClose={() => setSnoozeModalOpen(false)}
            onRuleChanged={async () => {
              refetch();
            }}
            onLoading={noop}
          />
        ) : null}
      </>
    </ObsCasesContext>
  );
}
