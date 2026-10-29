/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
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
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { isMac } from '@kbn/shared-ux-utility';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';
import { useStartInvestigation } from '../hooks/use_start_investigation';

export const START_INVESTIGATION_PANEL_ID = 'nightshiftStartInvestigationPanel';

const MODAL_MAX_WIDTH_PX = 480;

const SUBMIT_SHORTCUT_LABEL = isMac ? '⌘ + Enter' : 'Ctrl + Enter';

export interface StartInvestigationPanelProps {
  onClose: () => void;
}

/** Modal that collects a free-form question and starts a deductive investigation for it. */
export function StartInvestigationPanel({
  onClose,
}: StartInvestigationPanelProps): React.ReactElement {
  const titleId = useGeneratedHtmlId({ prefix: 'nightshiftStartInvestigationTitle' });
  const [message, setMessage] = useState('');
  const { startInvestigation, isStarting } = useStartInvestigation({ onStarted: onClose });

  const trimmedMessage = message.trim();
  const canSubmit = trimmedMessage.length > 0 && !isStarting;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) {
      return;
    }
    startInvestigation(trimmedMessage);
  }, [canSubmit, startInvestigation, trimmedMessage]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <EuiModal
      aria-labelledby={titleId}
      data-test-subj="nightshiftStartInvestigationPanel"
      id={START_INVESTIGATION_PANEL_ID}
      maxWidth={MODAL_MAX_WIDTH_PX}
      onClose={onClose}
      outsideClickCloses
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.nightshift.startInvestigation.modalTitle', {
            defaultMessage: 'Investigate',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.nightshift.startInvestigation.description', {
              defaultMessage:
                'Describe the problem you want to look at. Any additional information about your system is helpful.',
            })}
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFormRow
          fullWidth
          helpText={i18n.translate('xpack.nightshift.startInvestigation.inputHelpText', {
            defaultMessage: 'Press {keyboardShortcut} to start the investigation.',
            values: { keyboardShortcut: SUBMIT_SHORTCUT_LABEL },
          })}
        >
          <EuiTextArea
            autoFocus
            aria-label={i18n.translate('xpack.nightshift.startInvestigation.inputAriaLabel', {
              defaultMessage: 'What should be investigated?',
            })}
            data-test-subj="nightshiftStartInvestigationInput"
            disabled={isStarting}
            fullWidth
            maxLength={MAX_TEXT_LENGTH}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={i18n.translate('xpack.nightshift.startInvestigation.inputPlaceholder', {
              defaultMessage:
                "For example, why is checkout latency up? Or what caused last night's error spike?",
            })}
            resize="vertical"
            rows={3}
            value={message}
          />
        </EuiFormRow>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton
          data-test-subj="nightshiftStartInvestigationSubmitButton"
          disabled={!canSubmit}
          fill
          isLoading={isStarting}
          onClick={handleSubmit}
          size="s"
          {...getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.START_INVESTIGATION,
            element: NIGHTSHIFT_EBT_ELEMENTS.START_INVESTIGATION_PANEL,
          })}
        >
          {i18n.translate('xpack.nightshift.startInvestigation.submitButtonText', {
            defaultMessage: 'Investigate',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
