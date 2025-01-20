/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCopy, EuiButton, type EuiButtonProps } from '@elastic/eui';

interface CopyToClipboardButtonProps extends Omit<EuiButtonProps, 'onClick'> {
  textToCopy: string;
}

export const CopyToClipboardButton: FunctionComponent<CopyToClipboardButtonProps> = ({
  textToCopy,
  children,
  ...rest
}) => {
  return (
    <EuiCopy textToCopy={textToCopy}>
      {(copyToClipboard) => (
        <EuiButton
          data-test-subj="observabilityOnboardingCopyToClipboardButton"
          iconType="copyClipboard"
          onClick={copyToClipboard}
          {...rest}
        >
          {children ??
            i18n.translate(
              'xpack.observability_onboarding.copyToClipboardButton.copyToClipboardButtonLabel',
              { defaultMessage: 'Copy to clipboard' }
            )}
        </EuiButton>
      )}
    </EuiCopy>
  );
};
