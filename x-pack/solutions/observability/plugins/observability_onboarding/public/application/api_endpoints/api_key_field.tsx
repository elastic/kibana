/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiCopy,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  encodedApiKey?: string;
  isCreating: boolean;
  onCreate: () => void;
}

const MASKED_API_KEY = '•'.repeat(30);

export const ApiKeyField = ({ encodedApiKey, isCreating, onCreate }: Props) => {
  const { euiTheme } = useEuiTheme();
  const hasApiKey = Boolean(encodedApiKey);

  const copyLabel = i18n.translate(
    'xpack.observability_onboarding.apiEndpoints.copyApiKeyAriaLabel',
    {
      defaultMessage: 'Copy API key to clipboard',
    }
  );
  const apiKeyLabel = i18n.translate('xpack.observability_onboarding.apiEndpoints.apiKeyLabel', {
    defaultMessage: 'API key',
  });

  // EUI paints the enabled copy button white inside a readOnly field; force the readOnly grey instead.
  const copyButtonBackground = css`
    .euiButtonIcon {
      background-color: ${euiTheme.components.forms.backgroundReadOnly} !important;
    }
  `;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexEnd" responsive={false}>
      <EuiFlexItem>
        <EuiFormRow fullWidth css={copyButtonBackground} label={apiKeyLabel}>
          <EuiFieldText
            fullWidth
            readOnly
            value={hasApiKey ? MASKED_API_KEY : ''}
            placeholder={i18n.translate(
              'xpack.observability_onboarding.apiEndpoints.apiKeyPlaceholder',
              {
                defaultMessage: 'No API key yet',
              }
            )}
            data-test-subj="observabilityOnboardingApiEndpointApiKeyValue"
            aria-label={apiKeyLabel}
            append={
              hasApiKey ? (
                <EuiCopy textToCopy={encodedApiKey ?? ''}>
                  {(copy) => (
                    <EuiToolTip content={copyLabel} disableScreenReaderOutput>
                      <EuiButtonIcon
                        iconType="copyClipboard"
                        onClick={copy}
                        aria-label={copyLabel}
                        data-test-subj="observabilityOnboardingApiEndpointApiKeyCopyButton"
                      />
                    </EuiToolTip>
                  )}
                </EuiCopy>
              ) : undefined
            }
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          iconType="plusInCircle"
          onClick={onCreate}
          isLoading={isCreating}
          data-test-subj="observabilityOnboardingApiEndpointCreateApiKeyButton"
        >
          {i18n.translate('xpack.observability_onboarding.apiEndpoints.createKey', {
            defaultMessage: 'Create key',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
