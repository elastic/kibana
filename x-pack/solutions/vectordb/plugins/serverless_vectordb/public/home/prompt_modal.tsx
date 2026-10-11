/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiCopy,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface PromptModalProps {
  prompt: string;
  onClose: () => void;
}

export const PromptModal = ({ prompt, onClose }: PromptModalProps) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'vectordbPromptModal' });
  const { euiTheme } = useEuiTheme();

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={modalTitleId}
      maxWidth={euiTheme.base * 37.5}
      data-test-subj="vectordbPromptModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.serverlessVectordb.home.chat.promptModal.title', {
            defaultMessage: 'Prompt your coding agent',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.serverlessVectordb.home.chat.promptModal.description', {
              defaultMessage: 'Paste this prompt into any coding agent to install Elastic skills.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCodeBlock
          language="text"
          isCopyable
          paddingSize="m"
          data-test-subj="vectordbPromptModalCode"
        >
          {prompt}
        </EuiCodeBlock>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onClose}
          data-test-subj="vectordbPromptModalCloseButton"
          data-telemetry-id="serverlessVectordb-home-chat-closePrompt"
        >
          {i18n.translate('xpack.serverlessVectordb.home.chat.promptModal.close', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>
        <EuiCopy textToCopy={prompt}>
          {(copy) => (
            <EuiButton
              fill
              iconType="copy"
              onClick={copy}
              data-test-subj="vectordbPromptModalCopyButton"
              data-telemetry-id="serverlessVectordb-home-chat-copyPrompt"
            >
              {i18n.translate('xpack.serverlessVectordb.home.chat.promptModal.copy', {
                defaultMessage: 'Copy to clipboard',
              })}
            </EuiButton>
          )}
        </EuiCopy>
      </EuiModalFooter>
    </EuiModal>
  );
};
