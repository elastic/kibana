/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { upperFirst } from 'lodash';
import { i18n } from '@kbn/i18n';
import { AiButton, type AiButtonProps } from '@kbn/shared-ux-ai-components';
import type { InsightType } from '../../analytics';

type StartConversationButtonProps = AiButtonProps & {
  insightType: InsightType;
};

export function StartConversationButton({ insightType, ...props }: StartConversationButtonProps) {
  return (
    <AiButton
      data-test-subj={`observabilityAgentBuilder${upperFirst(insightType)}StartConversationButton`}
      variant="accent"
      iconType="productAgent"
      size="s"
      {...props}
    >
      {i18n.translate('xpack.observabilityAgentBuilder.aiInsight.startConversationButton.label', {
        defaultMessage: 'Start conversation',
      })}
    </AiButton>
  );
}
