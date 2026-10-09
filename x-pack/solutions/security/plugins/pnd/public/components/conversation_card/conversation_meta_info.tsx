/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { type Investigation } from '@kbn/pnd-common';
import { CONVERSATION_CARD_LABELS } from './translations';
import { getEmptyValue } from '../helpers';

export const ConversationMetaInfo = memo<{
  templateId: Investigation['template_id'];
  updatedAt: Investigation['updatedAt'];
}>(({ templateId, updatedAt }) => {
  const emptyValue = getEmptyValue();
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive direction="row">
      <EuiFlexItem grow={false}>
        <div>
          <EuiBadge color="hollow">
            {CONVERSATION_CARD_LABELS.templateTypes[templateId] ?? emptyValue}
          </EuiBadge>
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" component="span">
          <FormattedRelative value={updatedAt} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

ConversationMetaInfo.displayName = 'ConversationMetaInfo';
