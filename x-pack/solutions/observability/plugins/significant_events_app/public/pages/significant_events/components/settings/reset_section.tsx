/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiConfirmModal,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DeveloperModeBadge } from '../../../../components/developer_mode_badge/developer_mode_badge';
import { useSignificantEventsMaintenanceActions } from '../../../../hooks/use_significant_events_maintenance';

export function ResetSection({ canManage }: { canManage: boolean }) {
  const { reset, isResetting, isMutating } = useSignificantEventsMaintenanceActions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const canConfirm = canManage && !isMutating && confirmation === 'RESET';

  const closeModal = () => {
    setIsModalOpen(false);
    setConfirmation('');
  };

  return (
    <EuiSplitPanel.Outer
      hasBorder
      hasShadow={false}
      css={{ flexShrink: 0 }}
      data-test-subj="significantEventsResetSection"
    >
      <EuiSplitPanel.Inner color="subdued">
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <DeveloperModeBadge />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.significantEventsApp.settings.reset.sectionTitle"
                  defaultMessage="Reset Significant Events data"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.significantEventsApp.settings.reset.scopeDescription"
              defaultMessage="Permanently delete generated Significant Events data across every Kibana space and turn off continuous onboarding and scheduled discovery. There is no undo."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiToolTip
          content={
            !canManage
              ? i18n.translate('xpack.significantEventsApp.settings.reset.privilegeTooltip', {
                  defaultMessage: 'Reset requires the Nightshift Manage engines privilege.',
                })
              : undefined
          }
        >
          <span
            tabIndex={!canManage ? 0 : undefined}
            data-test-subj="significantEventsResetTrigger"
          >
            <EuiButton
              data-test-subj="significantEventsResetButton"
              data-ebt-action="openResetConfirmation"
              data-ebt-element="significantEventsResetButton"
              color="danger"
              iconType="trash"
              isLoading={isResetting}
              isDisabled={!canManage || isMutating}
              onClick={() => setIsModalOpen(true)}
            >
              <FormattedMessage
                id="xpack.significantEventsApp.settings.reset.resetButtonLabel"
                defaultMessage="Reset Significant Events data"
              />
            </EuiButton>
          </span>
        </EuiToolTip>
      </EuiSplitPanel.Inner>
      {isModalOpen && (
        <EuiConfirmModal
          data-test-subj="significantEventsResetModal"
          aria-label={i18n.translate('xpack.significantEventsApp.settings.reset.confirmAriaLabel', {
            defaultMessage: 'Confirm permanent Significant Events reset',
          })}
          title={i18n.translate('xpack.significantEventsApp.settings.reset.confirmTitle', {
            defaultMessage: 'Permanently reset Significant Events data?',
          })}
          onCancel={closeModal}
          onConfirm={() => {
            closeModal();
            reset();
          }}
          cancelButtonText={i18n.translate(
            'xpack.significantEventsApp.settings.reset.cancelButtonLabel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.significantEventsApp.settings.reset.confirmButtonLabel',
            { defaultMessage: 'Reset permanently' }
          )}
          confirmButtonDisabled={!canConfirm}
          buttonColor="danger"
          defaultFocusedButton="cancel"
        >
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.significantEventsApp.settings.reset.confirmScopeDescription"
                defaultMessage="This affects every Kibana space. It is permanent and cannot be undone. Reset cancels active workflow executions and permanently deletes:"
              />
            </p>
            <ul>
              <li>
                <FormattedMessage
                  id="xpack.significantEventsApp.settings.reset.knowledgeIndicatorsDetail"
                  defaultMessage="Knowledge indicators and stored queries, including their history"
                />
              </li>
              <li>
                <FormattedMessage
                  id="xpack.significantEventsApp.settings.reset.rulesDetail"
                  defaultMessage="Backing Alerting v2 rules"
                />
              </li>
              <li>
                <FormattedMessage
                  id="xpack.significantEventsApp.settings.reset.investigationsDetail"
                  defaultMessage="Nightshift investigations"
                />
              </li>
              <li>
                <FormattedMessage
                  id="xpack.significantEventsApp.settings.reset.dataStreamsDetail"
                  defaultMessage="Detections, discoveries, events, and knowledge-indicator system data streams (not user-created streams)"
                />
              </li>
            </ul>
            <p>
              <FormattedMessage
                id="xpack.significantEventsApp.settings.reset.endStateDescription"
                defaultMessage="Registered system data streams are recreated empty. Other managed workflows are restored after cleanup, but continuous onboarding and scheduled discovery settings remain off. Reset is best-effort; any failures are reported afterward."
              />
            </p>
          </EuiText>
          <EuiFormRow
            label={i18n.translate('xpack.significantEventsApp.settings.reset.confirmationLabel', {
              defaultMessage: 'Type {confirmation} to confirm',
              values: { confirmation: 'RESET' },
            })}
          >
            <EuiFieldText
              data-test-subj="significantEventsResetConfirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              maxLength={100}
              disabled={isMutating}
            />
          </EuiFormRow>
        </EuiConfirmModal>
      )}
    </EuiSplitPanel.Outer>
  );
}
