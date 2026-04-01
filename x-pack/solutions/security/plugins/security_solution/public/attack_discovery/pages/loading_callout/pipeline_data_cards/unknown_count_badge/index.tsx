/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import React from 'react';

import * as i18n from '../translations';

export const UnknownCountBadge: React.FC = () => (
  <span aria-label={i18n.UNKNOWN_COUNT_TOOLTIP} data-test-subj="unknownCountTooltip">
    <EuiToolTip content={i18n.UNKNOWN_COUNT_TOOLTIP}>
      <EuiBadge color="hollow" data-test-subj="unknownCountBadge">
        {'?'}
      </EuiBadge>
    </EuiToolTip>
  </span>
);
