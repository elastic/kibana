/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge } from '@elastic/eui';
import type { Investigation } from '@kbn/pnd-common';
import { getEmptyValue } from '../helpers';

export interface CriticalityBadgeProps {
  priorityScore: Investigation['priorityScore'];
}

export const CriticalityBadge = memo<CriticalityBadgeProps>(({ priorityScore }) => {
  const emptyValue = getEmptyValue();
  return (
    <div>
      <EuiBadge color="danger">
        {i18n.translate('xpack.pnd.criticalityBadge.priorityScore', {
          defaultMessage: 'Criticality · {priorityScore}',
          values: { priorityScore },
        }) ?? emptyValue}
      </EuiBadge>
    </div>
  );
});

CriticalityBadge.displayName = 'CriticalityBadge';
