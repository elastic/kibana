/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { upperFirst } from 'lodash';
import { EuiButton } from '@elastic/eui';
import { robotIconType } from '@kbn/observability-nav-icons';

export function StartConversationButton({
  insightType,
  ...props
}: React.ComponentProps<typeof EuiButton> & { insightType: string }) {
  return (
    <EuiButton
      data-test-subj={`observabilityAgentBuilder${upperFirst(insightType)}StartConversationButton`}
      fill
      iconType={robotIconType}
      size="s"
      {...props}
    >
      {i18n.translate('xpack.observabilityAgentBuilder.aiInsight.startConversationButton.label', {
        defaultMessage: 'Start conversation',
      })}
    </EuiButton>
  );
}
