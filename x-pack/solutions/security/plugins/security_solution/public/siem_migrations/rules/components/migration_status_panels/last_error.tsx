/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import * as i18n from './translations';

interface RuleMigrationsLastErrorProps {
  message: string;
}

export const RuleMigrationsLastError = React.memo<RuleMigrationsLastErrorProps>(({ message }) => (
  <EuiCallOut
    data-test-subj="ruleMigrationLastError"
    title={i18n.RULE_MIGRATION_ERROR_TITLE}
    color="danger"
    iconType="alert"
    size="s"
  >
    <EuiText size="s">{message}</EuiText>
  </EuiCallOut>
));
RuleMigrationsLastError.displayName = 'RuleMigrationsLastError';
