/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalHeaderTitle,
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  INACTIVE_SERIES_LOOKBACK_HOURS,
  MAX_DEACTIVATION_REASON_LENGTH,
} from '@kbn/significant-events-schema';
import { useUpdateSignificantEvent } from '../../../../hooks/use_update_significant_event';

const MODAL_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.deactivateModal.title',
  { defaultMessage: 'Mark significant event inactive' }
);

const MODAL_DESCRIPTION = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.deactivateModal.description',
  {
    defaultMessage:
      'Mark this event inactive. You can add a reason. It is recorded as the closure note and may be shown to the discovery agent if the same issue recurs within {hours} hours. The agent may reopen the event if it finds new evidence the reason does not explain.',
    values: { hours: INACTIVE_SERIES_LOOKBACK_HOURS },
  }
);

const REASON_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.deactivateModal.reasonLabel',
  { defaultMessage: 'Reason (optional)' }
);

const REASON_HELP_TEXT = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.deactivateModal.reasonHelpText',
  {
    defaultMessage:
      'Optional. Up to {max} characters. If left empty, the agent is told only that an operator set this inactive.',
    values: { max: MAX_DEACTIVATION_REASON_LENGTH },
  }
);

const MISSING_EPISODE_CALLOUT_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.deactivateModal.missingEpisodeCallout',
  {
    defaultMessage:
      'This event has no Alerting v2 episode and cannot be marked inactive from here.',
  }
);

const REASON_TOO_LONG_ERROR = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.deactivateModal.reasonTooLongError',
  {
    defaultMessage: 'The reason must be at most {max} characters',
    values: { max: MAX_DEACTIVATION_REASON_LENGTH },
  }
);

const CONFIRM_BUTTON_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.deactivateModal.confirmButton',
  { defaultMessage: 'Mark inactive' }
);

const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.deactivateModal.cancelButton',
  { defaultMessage: 'Cancel' }
);

interface DismissEventModalProps {
  eventId: string;
  /** The `alert.id` of the event's latest version; Alerting v2 `deactivate` targets it. */
  episodeId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DismissEventModal = ({ episodeId, onClose, onSuccess }: DismissEventModalProps) => {
  const [reason, setReason] = useState('');
  const { deactivateEvent, isUpdating } = useUpdateSignificantEvent({
    onUpdateSuccess: onSuccess ?? onClose,
  });
  const modalTitleId = useGeneratedHtmlId({ prefix: 'deactivateEventModal' });

  const trimmedReason = reason.trim();
  const canDeactivate = Boolean(episodeId);
  const isReasonInvalid = trimmedReason.length > MAX_DEACTIVATION_REASON_LENGTH;

  const handleConfirm = () => {
    if (isReasonInvalid || !canDeactivate) {
      return;
    }
    deactivateEvent({ episodeId, reason: trimmedReason });
  };

  return (
    <EuiModal
      onClose={onClose}
      data-test-subj="sigEventDismissModal"
      aria-labelledby={modalTitleId}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column" gutterSize="xs">
          {!canDeactivate && (
            <EuiFlexItem>
              <EuiCallOut
                announceOnMount
                color="warning"
                size="s"
                title={MISSING_EPISODE_CALLOUT_TITLE}
                data-test-subj="sigEventDismissMissingEpisode"
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiText size="s">
              <p>{MODAL_DESCRIPTION}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={REASON_LABEL}
              fullWidth
              isInvalid={isReasonInvalid}
              helpText={REASON_HELP_TEXT}
              error={isReasonInvalid ? REASON_TOO_LONG_ERROR : undefined}
            >
              <EuiTextArea
                fullWidth
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                isInvalid={isReasonInvalid}
                disabled={isUpdating || !canDeactivate}
                data-test-subj="sigEventDismissReasonInput"
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="significantEventsAppDismissEventModalButton"
          onClick={onClose}
          isDisabled={isUpdating}
        >
          {CANCEL_BUTTON_LABEL}
        </EuiButtonEmpty>
        <EuiButton
          color="danger"
          fill
          onClick={handleConfirm}
          isLoading={isUpdating}
          isDisabled={isUpdating || isReasonInvalid || !canDeactivate}
          data-test-subj="sigEventDismissConfirmButton"
        >
          {CONFIRM_BUTTON_LABEL}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
