/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import * as i18n from './translations';

interface ModifiedBadgeProps {
  tooltip?: ReactNode;
}

export function ModifiedBadge({ tooltip }: ModifiedBadgeProps): JSX.Element {
  return (
    <EuiToolTip content={tooltip}>
      <EuiBadge tabIndex={0} color="hollow" iconType="indexEdit" iconSide="left">
        {i18n.MODIFIED}
      </EuiBadge>
    </EuiToolTip>
  );
}
