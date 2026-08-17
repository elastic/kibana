/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { type Investigation } from '@kbn/pnd-common';
import { TemplateBadge } from './template_badge';

export const ConversationMetaInfo = memo<{
  templateId: Investigation['template_id'];
  updatedAt: Investigation['updatedAt'];
}>(({ templateId, updatedAt }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive direction="row">
      <EuiFlexItem grow={false}>
        <TemplateBadge template={templateId} />
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
