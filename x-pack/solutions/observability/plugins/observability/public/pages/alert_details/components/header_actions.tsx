/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import type { AlertStatus } from '@kbn/rule-data-utils';
import { ALERT_RULE_UUID, ALERT_STATUS_ACTIVE, ALERT_UUID } from '@kbn/rule-data-utils';

import { useKibana } from '../../../utils/kibana_react';
import type { TopAlert } from '../../../typings/alerts';
import { paths } from '../../../../common/locators/paths';
import { useBulkUntrackAlerts } from '../hooks/use_bulk_untrack_alerts';
import {
  AlertDetailsRuleFormFlyout,
  type AlertDetailsRuleFormFlyoutBaseProps,
} from './alert_details_rule_form_flyout';
import { ObsCasesContext } from './obs_cases_context';
import { AddToCaseButton } from './add_to_case_button';
import { useDiscoverUrl } from '../hooks/use_discover_url/use_discover_url';

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

  const [alertDetailsRuleFormFlyoutOpen, setAlertDetailsRuleFormFlyoutOpen] = useState(false);

  const handleTogglePopover = () => setIsPopoverOpen(!isPopoverOpen);
  const handleClosePopover = () => setIsPopoverOpen(false);

  const handleOpenSnoozeModal = () => {
    setIsPopoverOpen(false);
    setSnoozeModalOpen(true);
  };

  return (
    <>
      <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
        {discoverUrl && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={discoverUrl}
              iconType="discoverApp"
              target="_blank"
              data-test-subj={`alertDetailsPage_viewInDiscover${rule ? `_${rule.ruleTypeId}` : ''}`}
            >
              <EuiText size="s">
                {i18n.translate('xpack.observability.alertDetails.viewInDiscover', {
                  defaultMessage: 'View in Discover',
                })}
              </EuiText>
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}

        {cases && (
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
            button={
              <EuiButtonIcon
                display="base"
                size="m"
                iconType="boxesVertical"
                data-test-subj="alert-details-header-actions-menu-button"
                onClick={handleTogglePopover}
                aria-label={i18n.translate('xpack.observability.alertDetails.actionsButtonLabel', {
                  defaultMessage: 'Actions',
                })}
              />
            }
          >
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
                  iconType="eyeClosed"
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

                <EuiHorizontalRule margin="none" />

                <EuiButtonEmpty
                  size="s"
                  color="text"
                  iconType="link"
                  disabled={!alert?.fields[ALERT_RULE_UUID] || !rule}
                  data-test-subj="view-rule-details-button"
                  href={rule ? http.basePath.prepend(paths.observability.ruleDetails(rule.id)) : ''}
                  target="_blank"
                >
                  <EuiText size="s">
                    {i18n.translate('xpack.observability.alertDetails.viewRuleDetails', {
                      defaultMessage: 'Go to rule details',
                    })}
                  </EuiText>
                </EuiButtonEmpty>

                <div />
              </EuiFlexGroup>
            </div>
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
  );
}
