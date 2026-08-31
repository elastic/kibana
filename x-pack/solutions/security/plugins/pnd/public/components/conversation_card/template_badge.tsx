/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge } from '@elastic/eui';
import type { Investigation } from '@kbn/pnd-common';
import { CONVERSATION_CARD_LABELS } from './translations';
import { getEmptyValue } from '../helpers';

export interface TemplateBadgeProps {
  template: Investigation['template_id'];
}

export const TemplateBadge = memo<TemplateBadgeProps>(({ template }) => {
  const emptyValue = getEmptyValue();
  return (
    <div>
      <EuiBadge color="hollow">
        {CONVERSATION_CARD_LABELS.templateTypes[template] ?? emptyValue}
      </EuiBadge>
    </div>
  );
});

TemplateBadge.displayName = 'TemplateBadge';
