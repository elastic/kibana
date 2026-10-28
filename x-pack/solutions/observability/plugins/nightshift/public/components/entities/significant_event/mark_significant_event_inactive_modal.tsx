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
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import React, { useState } from 'react';
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
      'Mark this event inactive. Optionally add an assessment note to record the operator rationale.',
  }
);

const REASON_LABEL = i18n.translate(
  'xpack.nightshift.markSignificantEventInactiveModal.reasonLabel',
  { defaultMessage: 'Assessment note (optional)' }
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
  onClose,
  onSuccess,
}: {
  eventId: string;
  onClose: () => void;
  onSuccess?: () => void;
}): React.ReactElement => {
  const [assessmentNote, setAssessmentNote] = useState('');
  const { closeSignificantEvent, closingEventId } = useCloseSignificantEvent({
    onClosed: onSuccess ?? onClose,
  });
  const modalTitleId = useGeneratedHtmlId({
    prefix: 'nightshiftMarkSignificantEventInactiveModal',
  });
  const isUpdating = closingEventId === eventId;

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
        <EuiText size="s">
          <p>{MODAL_DESCRIPTION}</p>
        </EuiText>
        <EuiFormRow label={REASON_LABEL} fullWidth>
          <EuiTextArea
            fullWidth
            value={assessmentNote}
            onChange={(event) => setAssessmentNote(event.target.value)}
            maxLength={MAX_TEXT_LENGTH}
            disabled={isUpdating}
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
          onClick={() => closeSignificantEvent(eventId, assessmentNote)}
          isLoading={isUpdating}
          isDisabled={isUpdating}
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
