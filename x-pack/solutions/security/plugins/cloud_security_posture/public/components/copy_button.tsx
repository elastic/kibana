/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiCopy } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const COPY_ARIA_LABEL = i18n.translate('xpack.csp.clipboard.copy', {
  defaultMessage: 'Copy',
});

export const CopyButton: React.FC<{ copyText: string }> = ({ copyText }) => (
  <EuiCopy textToCopy={copyText}>
    {(copy) => (
      <EuiButtonIcon color="text" aria-label={COPY_ARIA_LABEL} iconType="copy" onClick={copy} />
    )}
  </EuiCopy>
);
