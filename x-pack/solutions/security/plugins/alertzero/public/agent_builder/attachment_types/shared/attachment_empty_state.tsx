/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';

/**
 * Empty-state panel shared by the attachment inline renderers when the payload cannot be
 * parsed or resolved. `variant: 'text'` renders subdued body text; `variant: 'warning'` renders
 * an announced `KbnWarningCallout` (used by the threat renderer, whose empty state also needs
 * to survive a live-fetch failure, not just a parse failure).
 */
export const AttachmentEmptyState: React.FC<{
  testSubj: string;
  message: string;
  variant?: 'text' | 'warning';
  hasShadow?: boolean;
}> = ({ testSubj, message, variant = 'text', hasShadow = false }) => (
  <EuiPanel hasShadow={hasShadow} hasBorder={false} paddingSize="s" data-test-subj={testSubj}>
    {variant === 'warning' ? (
      <KbnWarningCallout announceOnMount size="s" title={message} />
    ) : (
      <EuiText size="s" color="subdued">
        {message}
      </EuiText>
    )}
  </EuiPanel>
);
