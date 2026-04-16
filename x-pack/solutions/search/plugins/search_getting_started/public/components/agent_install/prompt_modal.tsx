/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiCopy,
  EuiText,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface PromptModalProps {
  prompt: string;
  onClose: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ prompt, onClose }) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'promptModal' });

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId} maxWidth={600}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.gettingStarted.promptModal.title', {
            defaultMessage: 'Copy prompt to your coding agent',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.gettingStarted.promptModal.description', {
              defaultMessage:
                'Paste this prompt into any coding agent to install the Elasticsearch onboarding skills.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCodeBlock language="text" isCopyable paddingSize="m" data-test-subj="promptModalCode">
          {prompt}
        </EuiCodeBlock>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="promptModalCloseBtn">
          {i18n.translate('xpack.gettingStarted.promptModal.close', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>
        <EuiCopy textToCopy={prompt}>
          {(copy) => (
            <EuiButton onClick={copy} fill data-test-subj="promptModalCopyBtn">
              {i18n.translate('xpack.gettingStarted.promptModal.copy', {
                defaultMessage: 'Copy to clipboard',
              })}
            </EuiButton>
          )}
        </EuiCopy>
      </EuiModalFooter>
    </EuiModal>
  );
};
