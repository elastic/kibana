/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiCopy,
  EuiFieldText,
  EuiFormRow,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  url?: string;
  isLoading: boolean;
}

export const EndpointField = ({ url, isLoading }: Props) => {
  const { euiTheme } = useEuiTheme();
  const copyLabel = i18n.translate('xpack.observability_onboarding.apiEndpoints.copyAriaLabel', {
    defaultMessage: 'Copy endpoint to clipboard',
  });

  // EUI paints the enabled copy button white inside a readOnly field; force the readOnly grey instead.
  const copyButtonBackground = css`
    .euiButtonIcon {
      background-color: ${euiTheme.components.forms.backgroundReadOnly} !important;
    }
  `;

  return (
    <EuiFormRow
      fullWidth
      css={copyButtonBackground}
      label={i18n.translate('xpack.observability_onboarding.apiEndpoints.endpointLabel', {
        defaultMessage: 'Endpoint',
      })}
    >
      <EuiFieldText
        fullWidth
        readOnly
        isLoading={isLoading}
        value={url ?? ''}
        data-test-subj="observabilityOnboardingApiEndpointValue"
        aria-label={i18n.translate('xpack.observability_onboarding.apiEndpoints.endpointLabel', {
          defaultMessage: 'Endpoint',
        })}
        append={
          <EuiCopy textToCopy={url ?? ''}>
            {(copy) => (
              <EuiToolTip content={copyLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="copyClipboard"
                  onClick={copy}
                  isDisabled={!url}
                  aria-label={copyLabel}
                  data-test-subj="observabilityOnboardingApiEndpointCopyButton"
                />
              </EuiToolTip>
            )}
          </EuiCopy>
        }
      />
    </EuiFormRow>
  );
};
