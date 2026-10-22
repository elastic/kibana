/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { globalLimitLabels } from './translations';

export const GlobalLimitCallout = () => (
  <EuiCallOut
    announceOnMount
    size="s"
    color="warning"
    iconType="hourglass"
    title={globalLimitLabels.title}
    data-test-subj="automationsGlobalLimitBanner"
  >
    {globalLimitLabels.body}
  </EuiCallOut>
);
