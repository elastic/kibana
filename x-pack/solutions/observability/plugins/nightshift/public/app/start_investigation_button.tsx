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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';

interface Props {
  onSuccess: (investigationId: string) => void;
}

export function StartInvestigationButton({ onSuccess }: Props): React.ReactElement {
  const { http } = useKibana().services;
  const [isOpen, setIsOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const close = () => {
    setIsOpen(false);
    setPromptText('');
  };

  const submit = async () => {
    setIsSubmitting(true);
    try {
      const response = await http.post<{ investigation_id: string }>(
        '/internal/nightshift/investigations',
        {
          body: JSON.stringify({
            subject: { type: 'alert', id: crypto.randomUUID() },
            ...(promptText ? { message: promptText } : {}),
          }),
        }
      );
      close();
      onSuccess(response.investigation_id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerButton = (
    <EuiButton
      color="primary"
      data-test-subj="nightshiftStartInvestigationButton"
      iconType="plus"
      onClick={() => setIsOpen((v) => !v)}
      size="s"
    >
      {i18n.translate('xpack.nightshift.startInvestigation.buttonLabel', {
        defaultMessage: 'Start new investigation',
      })}
    </EuiButton>
  );

  return (
    <EuiPopover
      anchorPosition="downRight"
      button={triggerButton}
      closePopover={close}
      isOpen={isOpen}
      panelPaddingSize="m"
      panelStyle={{ width: 360 }}
    >
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiTextArea
            autoFocus
            compressed
            data-test-subj="nightshiftStartInvestigationTextArea"
            disabled={isSubmitting}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder={i18n.translate(
              'xpack.nightshift.startInvestigation.textAreaPlaceholder',
              { defaultMessage: 'What should the investigation focus on?' }
            )}
            resize="none"
            rows={4}
            value={promptText}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="nightshiftStartInvestigationCancelButton"
                disabled={isSubmitting}
                onClick={close}
                size="s"
              >
                {i18n.translate('xpack.nightshift.startInvestigation.cancelButtonLabel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="nightshiftStartInvestigationSubmitButton"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                onClick={submit}
                size="s"
              >
                {i18n.translate('xpack.nightshift.startInvestigation.startButtonLabel', {
                  defaultMessage: 'Start',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
}
