/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';

const labels = {
  title: i18n.translate('xpack.nightshift.automations.webhookCredentials.title', {
    defaultMessage: 'Webhook ready',
  }),
  callout: i18n.translate('xpack.nightshift.automations.webhookCredentials.callout', {
    defaultMessage: 'Copy the token now. It is shown once and cannot be retrieved later.',
  }),
  url: i18n.translate('xpack.nightshift.automations.webhookCredentials.url', {
    defaultMessage: 'URL',
  }),
  token: i18n.translate('xpack.nightshift.automations.webhookCredentials.token', {
    defaultMessage: 'Token',
  }),
  example: i18n.translate('xpack.nightshift.automations.webhookCredentials.example', {
    defaultMessage: 'Try it',
  }),
  done: i18n.translate('xpack.nightshift.automations.webhookCredentials.done', {
    defaultMessage: 'Done',
  }),
};

export const WebhookCredentialsModal = ({
  url,
  token,
  payload,
  onClose,
}: {
  url: string;
  token: string;
  /** A JSON body this webhook accepts, used in the example request. */
  payload: string;
  onClose: () => void;
}) => {
  const titleId = useGeneratedHtmlId();
  const example = [
    `curl -X POST '${url}' \\`,
    `  -H 'Authorization: Bearer ${token}' \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -d '${payload}'`,
  ].join('\n');

  return (
    <EuiModal onClose={onClose} aria-labelledby={titleId} data-test-subj="automationWebhookModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{labels.title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <KbnWarningCallout announceOnMount size="s" title={labels.callout} />
        <EuiSpacer size="m" />
        <EuiFormRow label={labels.url} fullWidth>
          <EuiCodeBlock isCopyable paddingSize="s" fontSize="s" transparentBackground>
            {url}
          </EuiCodeBlock>
        </EuiFormRow>
        <EuiFormRow label={labels.token} fullWidth>
          <EuiCodeBlock
            isCopyable
            paddingSize="s"
            fontSize="s"
            transparentBackground
            data-test-subj="automationWebhookToken"
          >
            {token}
          </EuiCodeBlock>
        </EuiFormRow>
        <EuiFormRow label={labels.example} fullWidth>
          <EuiCodeBlock isCopyable language="bash" paddingSize="s" fontSize="s">
            {example}
          </EuiCodeBlock>
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton fill onClick={onClose} data-test-subj="automationWebhookModalDone">
          {labels.done}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
