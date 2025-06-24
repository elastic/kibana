/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import * as i18n from './translations';

export function NoChanges() {
  return (
    <EuiText size="s" color="subdued">
      {i18n.NO_CHANGES}
    </EuiText>
  );
}
