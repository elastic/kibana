/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React, { useState } from 'react';
import {
  INACTIVE_SERIES_LOOKBACK_HOURS,
  MAX_DEACTIVATION_REASON_LENGTH,
} from '@kbn/significant-events-schema';
import {
  NIGHTSHIFT_EBT_ACTIONS,
  NIGHTSHIFT_EBT_DETAILS,
  NIGHTSHIFT_EBT_ELEMENTS,
} from '../../../common/ebt_constants';
import { useCloseSignificantEvent } from '../../../hooks/use_close_significant_event';

const MODAL_TITLE = i18n.translate('xpack.nightshift.markSignificantEventInactiveModal.title', {
  defaultMessage: 'Mark significant event inactive',
});

const MODAL_DESCRIPTION = i18n.translate(
  'xpack.nightshift.markSignificantEventInactiveModal.description',
  {
    defaultMessage:
      'Mark this event inactive. You can add a reason. It is recorded as the closure note and may be shown to the discovery agent if the same issue recurs within {hours} hours. The agent may reopen the event if it finds new evidence the reason does not explain.',
    values: { hours: INACTIVE_SERIES_LOOKBACK_HOURS },
  }
);

const REASON_LABEL = i18n.translate(
  'xpack.nightshift.markSignificantEventInactiveModal.reasonLabel',
  { defaultMessage: 'Reason (optional)' }
);

const REASON_HELP_TEXT = i18n.translate(
  'xpack.nightshift.markSignificantEventInactiveModal.reasonHelpText',
  {
    defaultMessage:
      'Optional. Up to {max} characters. If left empty, the agent is told only that an operator set this inactive.',
    values: { max: MAX_DEACTIVATION_REASON_LENGTH },
  }
);

const MISSING_EPISODE_CALLOUT_TITLE = i18n.translate(
  'xpack.nightshift.markSignificantEventInactiveModal.missingEpisodeCallout',
  {
    defaultMessage:
      'This event has no Alerting v2 episode and cannot be marked inactive from here.',
  }
);

const REASON_TOO_LONG_ERROR = i18n.translate(
  'xpack.nightshift.markSignificantEventInactiveModal.reasonTooLongError',
  {
    defaultMessage: 'The reason must be at most {max} characters',
    values: { max: MAX_DEACTIVATION_REASON_LENGTH },
  }
);

const CONFIRM_BUTTON_LABEL = i18n.translate(
  'xpack.nightshift.markSignificantEventInactiveModal.confirmButton',
  { defaultMessage: 'Mark inactive' }
);

const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.nightshift.markSignificantEventInactiveModal.cancelButton',
  { defaultMessage: 'Cancel' }
);

export const MarkSignificantEventInactiveModal = ({
  eventId,
  episodeId,
  onClose,
  onSuccess,
}: {
  eventId: string;
  /** The `alert.id` of the event's latest version; Alerting v2 `deactivate` targets it. */
  episodeId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}): React.ReactElement => {
  const [reason, setReason] = useState('');
  const { closeSignificantEvent, closingEventId } = useCloseSignificantEvent({
    onClosed: onSuccess ?? onClose,
  });
  const modalTitleId = useGeneratedHtmlId({
    prefix: 'nightshiftMarkSignificantEventInactiveModal',
  });
  const isUpdating = closingEventId === eventId;
  const trimmedReason = reason.trim();
  const canDeactivate = Boolean(episodeId);
  const isReasonInvalid = trimmedReason.length > MAX_DEACTIVATION_REASON_LENGTH;

  return (
    <EuiModal
      onClose={onClose}
      data-test-subj="nightshiftMarkSignificantEventInactiveModal"
      aria-labelledby={modalTitleId}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {!canDeactivate && (
          <>
            <KbnWarningCallout
              size="s"
              title={MISSING_EPISODE_CALLOUT_TITLE}
              data-test-subj="nightshiftMarkSignificantEventInactiveMissingEpisode"
            />
            <EuiSpacer size="m" />
          </>
        )}
        <EuiText size="s">
          <p>{MODAL_DESCRIPTION}</p>
        </EuiText>
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
            onChange={(event) => setReason(event.target.value)}
            isInvalid={isReasonInvalid}
            disabled={isUpdating || !canDeactivate}
            data-test-subj="nightshiftMarkSignificantEventInactiveReason"
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onClose}
          isDisabled={isUpdating}
          data-test-subj="nightshiftMarkSignificantEventInactiveCancel"
        >
          {CANCEL_BUTTON_LABEL}
        </EuiButtonEmpty>
        <EuiButton
          color="danger"
          fill
          onClick={() => closeSignificantEvent({ eventId, episodeId, reason: trimmedReason })}
          isLoading={isUpdating}
          isDisabled={isUpdating || isReasonInvalid || !canDeactivate}
          data-test-subj="nightshiftMarkSignificantEventInactiveConfirm"
          {...getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.CLOSE_SIGNIFICANT_EVENT,
            element: NIGHTSHIFT_EBT_ELEMENTS.MARK_SIGNIFICANT_EVENT_INACTIVE_MODAL,
            detail: NIGHTSHIFT_EBT_DETAILS.NEEDS_ACTION,
          })}
        >
          {CONFIRM_BUTTON_LABEL}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
