/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';

export function StartConversationButton(props: React.ComponentProps<typeof EuiButton>) {
  return (
    <EuiButton
      data-test-subj="aiAgentStartConversationButton"
      fill
      iconType="productAgent"
      size="s"
      {...props}
    >
      {i18n.translate('xpack.observabilityAgentBuilder.aiInsight.startConversationButton.label', {
        defaultMessage: 'Start conversation',
      })}
    </EuiButton>
  );
}
