/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiPanel,
} from '@elastic/eui';

interface EnableWiredStreamsConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  isServerless?: boolean;
  streamsDocLink?: string;
}

export function EnableWiredStreamsConfirmModal({
  onCancel,
  onConfirm,
  isLoading = false,
  isServerless = false,
  streamsDocLink,
}: EnableWiredStreamsConfirmModalProps) {
  const envType = isServerless ? 'project' : 'cluster';

  return (
    <EuiModal
      onClose={onCancel}
      aria-labelledby="enableWiredStreamsModalTitle"
      data-test-subj="observabilityOnboardingEnableWiredStreamsModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id="enableWiredStreamsModalTitle">
          {i18n.translate('xpack.observability_onboarding.enableWiredStreamsModal.title', {
            defaultMessage: 'Enable Wired Streams',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.observability_onboarding.enableWiredStreamsModal.introText', {
              defaultMessage:
                'Wired Streams is a next-generation log management feature that provides a managed hierarchy for logs with centralized data retention and routing.',
            })}{' '}
            {streamsDocLink && (
              <EuiLink
                href={streamsDocLink}
                target="_blank"
                external
                data-test-subj="observabilityOnboardingEnableWiredStreamsModalLearnMoreLink"
              >
                {i18n.translate(
                  'xpack.observability_onboarding.enableWiredStreamsModal.learnMore',
                  {
                    defaultMessage: 'Learn more',
                  }
                )}
              </EuiLink>
            )}
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiPanel color="subdued" paddingSize="m" hasShadow={false}>
          <EuiText size="s">
            <strong>
              {i18n.translate(
                'xpack.observability_onboarding.enableWiredStreamsModal.whatHappensTitle',
                {
                  defaultMessage: 'What happens when you enable it:',
                }
              )}
            </strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            <ul>
              <li>
                {i18n.translate('xpack.observability_onboarding.enableWiredStreamsModal.bullet1', {
                  defaultMessage:
                    'Root log streams ("logs.otel" and "logs.ecs") are created for your {envType}',
                  values: { envType },
                })}
              </li>
              <li>
                {i18n.translate('xpack.observability_onboarding.enableWiredStreamsModal.bullet2', {
                  defaultMessage:
                    'Logs from this setup will be routed to the appropriate root stream',
                })}
              </li>
              <li>
                {i18n.translate('xpack.observability_onboarding.enableWiredStreamsModal.bullet3', {
                  defaultMessage: 'Metrics and traces continue through standard data streams',
                })}
              </li>
              <li>
                {i18n.translate('xpack.observability_onboarding.enableWiredStreamsModal.bullet4', {
                  defaultMessage: 'Your existing data is not affected',
                })}
              </li>
            </ul>
          </EuiText>
        </EuiPanel>

        <EuiSpacer size="m" />

        <EuiText size="s">
          {i18n.translate('xpack.observability_onboarding.enableWiredStreamsModal.reversibleNote', {
            defaultMessage: 'This can be changed later in Streams settings.',
          })}
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onCancel}
          disabled={isLoading}
          data-test-subj="observabilityOnboardingEnableWiredStreamsCancelButton"
        >
          {i18n.translate('xpack.observability_onboarding.enableWiredStreamsModal.cancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          color="primary"
          fill
          isLoading={isLoading}
          onClick={onConfirm}
          data-test-subj="observabilityOnboardingEnableWiredStreamsConfirmButton"
        >
          {i18n.translate('xpack.observability_onboarding.enableWiredStreamsModal.confirmButton', {
            defaultMessage: 'Enable Wired Streams',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
