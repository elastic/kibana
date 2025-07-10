/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import * as i18n from './translations';

export const RuleHasMissingBaseVersionCallout = () => (
  <EuiCallOut color="warning" size="s">
    <p>{i18n.RULE_BASE_VERSION_IS_MISSING_DESCRIPTION}</p>
  </EuiCallOut>
);
