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
  EuiFormRow,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getEbtProps } from '@kbn/ebt-click';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../common/ebt_constants';
import { useSignificantEventsMaintenanceActions } from '../../data/maintenance/use_significant_events_maintenance';
import { SettingsSectionRow } from './settings_section';

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
    <>
      <SettingsSectionRow
        data-test-subj="significantEventsResetSection"
        title={i18n.translate('xpack.nightshift.settings.reset.sectionTitle', {
          defaultMessage: 'Reset Significant Events data',
        })}
        description={
          <p>
            <FormattedMessage
              id="xpack.nightshift.settings.reset.scopeDescription"
              defaultMessage="Permanently delete generated Significant Events data in this space only and turn off its continuous onboarding and scheduled discovery. Other spaces are not affected. There is no undo."
            />
          </p>
        }
      >
        <EuiToolTip
          content={
            !canManage
              ? i18n.translate('xpack.nightshift.settings.reset.privilegeTooltip', {
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
              size="s"
              color="danger"
              iconType="trash"
              isLoading={isResetting}
              isDisabled={!canManage || isMutating}
              onClick={() => setIsModalOpen(true)}
              {...getEbtProps({
                action: NIGHTSHIFT_EBT_ACTIONS.OPEN_RESET_CONFIRMATION,
                element: NIGHTSHIFT_EBT_ELEMENTS.SETTINGS,
              })}
            >
              <FormattedMessage
                id="xpack.nightshift.settings.reset.resetButtonLabel"
                defaultMessage="Reset Significant Events data"
              />
            </EuiButton>
          </span>
        </EuiToolTip>
      </SettingsSectionRow>
      {isModalOpen && (
        <EuiConfirmModal
          data-test-subj="significantEventsResetModal"
          aria-label={i18n.translate('xpack.nightshift.settings.reset.confirmAriaLabel', {
            defaultMessage: 'Confirm permanent Significant Events reset',
          })}
          title={i18n.translate('xpack.nightshift.settings.reset.confirmTitle', {
            defaultMessage: 'Permanently reset Significant Events data?',
          })}
          onCancel={closeModal}
          onConfirm={() => {
            closeModal();
            reset();
          }}
          cancelButtonText={i18n.translate('xpack.nightshift.settings.reset.cancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.nightshift.settings.reset.confirmButtonLabel', {
            defaultMessage: 'Reset permanently',
          })}
          confirmButtonDisabled={!canConfirm}
          buttonColor="danger"
          initialFocus="[data-test-subj='significantEventsResetConfirmation']"
        >
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.nightshift.settings.reset.confirmScopeDescription"
                defaultMessage="This affects only the current Kibana space. It is permanent and cannot be undone. Reset cancels Significant Events workflow executions in this space and permanently deletes:"
              />
            </p>
            <ul>
              <li>
                <FormattedMessage
                  id="xpack.nightshift.settings.reset.knowledgeIndicatorsDetail"
                  defaultMessage="Knowledge indicators and stored queries, including their history"
                />
              </li>
              <li>
                <FormattedMessage
                  id="xpack.nightshift.settings.reset.rulesDetail"
                  defaultMessage="Backing Alerting v2 rules"
                />
              </li>
              <li>
                <FormattedMessage
                  id="xpack.nightshift.settings.reset.documentsDetail"
                  defaultMessage="Detections, detection markers, and legacy discovery documents tagged with this space"
                />
              </li>
            </ul>
            <p>
              <FormattedMessage
                id="xpack.nightshift.settings.reset.preservedDataDescription"
                defaultMessage="Other spaces, source definitions and ES|QL views, investigations, untagged legacy documents, and event history (.rule-events) are preserved. Shared system data streams and user data are not deleted."
              />
            </p>
            <p>
              <FormattedMessage
                id="xpack.nightshift.settings.reset.endStateDescription"
                defaultMessage="Other managed workflows are restored after cleanup, but continuous onboarding and scheduled discovery settings remain off in this space. Workflows shared by all spaces stay enabled. Reset is best-effort; any failures are reported afterward."
              />
            </p>
          </EuiText>
          <EuiFormRow
            label={i18n.translate('xpack.nightshift.settings.reset.confirmationLabel', {
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
    </>
  );
}
