/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';
import { useKibana } from '../services';

interface ConnectToProjectProps {
  elasticsearchUrl: string | null | undefined;
  apiKey: string | null | undefined;
  isLoading: boolean;
}

export const ConnectToProject = ({
  elasticsearchUrl,
  apiKey,
  isLoading,
}: ConnectToProjectProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { notifications },
  } = useKibana();

  return (
    <>
      <EuiText size="s">
        <strong>
          {i18n.translate('vectordbOnboarding.pathSelection.connectLabel', {
            defaultMessage: 'Connect to your project:',
          })}
        </strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          {isLoading ? (
            <EuiLoadingSpinner size="m" />
          ) : (
            <EuiPanel paddingSize="s" hasBorder>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <EuiCode
                    transparentBackground
                    css={css({
                      color: euiTheme.colors.textParagraph,
                      fontWeight: euiTheme.font.weight.regular,
                    })}
                  >
                    {elasticsearchUrl}
                  </EuiCode>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiCopy textToCopy={elasticsearchUrl || ''}>
                    {(copy) => (
                      <EuiToolTip
                        content={i18n.translate('vectordbOnboarding.pathSelection.copyUrl', {
                          defaultMessage: 'Copy',
                        })}
                        disableScreenReaderOutput
                      >
                        <EuiButtonIcon
                          iconType="copy"
                          onClick={copy}
                          aria-label={i18n.translate(
                            'vectordbOnboarding.pathSelection.copyUrlAriaLabel',
                            {
                              defaultMessage: 'Copy Elasticsearch URL',
                            }
                          )}
                          data-telemetry-id="vectordbOnboarding-connectToProject-copyUrl"
                        />
                      </EuiToolTip>
                    )}
                  </EuiCopy>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {apiKey ? (
            <EuiCopy textToCopy={apiKey}>
              {(copy) => (
                <EuiButton
                  fill
                  iconType="key"
                  onClick={copy}
                  data-test-subj="vectordbPathSelectionCopyApiKey"
                  data-telemetry-id="vectordbOnboarding-connectToProject-copyApiKey"
                >
                  {i18n.translate('vectordbOnboarding.pathSelection.copyApiKey', {
                    defaultMessage: 'Copy your API key',
                  })}
                </EuiButton>
              )}
            </EuiCopy>
          ) : (
            <EuiButton
              fill
              iconType="key"
              isLoading={isLoading}
              onClick={() =>
                openWiredConnectionDetails({
                  props: { options: { defaultTabId: 'apiKeys' } },
                }).catch((error) => {
                  notifications.toasts.addDanger(
                    error?.body?.message ??
                      error?.message ??
                      i18n.translate('vectordbOnboarding.pathSelection.unexpectedError', {
                        defaultMessage: 'An unexpected error occurred',
                      })
                  );
                })
              }
              data-test-subj="vectordbPathSelectionCopyApiKey"
              data-telemetry-id="vectordbOnboarding-connectToProject-generateApiKey"
            >
              {i18n.translate('vectordbOnboarding.pathSelection.generateApiKey', {
                defaultMessage: 'Generate API key',
              })}
            </EuiButton>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
