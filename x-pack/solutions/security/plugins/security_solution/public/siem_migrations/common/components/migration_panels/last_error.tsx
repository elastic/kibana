/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { MIGRATION_ERROR_TITLE } from './translations';
import type { MigrationType } from '../../../../../common/siem_migrations/types';

interface MigrationsLastErrorProps {
  message: string;
  migrationType: MigrationType;
}

export const MigrationsLastError = React.memo<MigrationsLastErrorProps>(
  ({ message, migrationType }) => (
    <EuiCallOut
      data-test-subj={`${migrationType}MigrationLastError`}
      title={MIGRATION_ERROR_TITLE}
      color="danger"
      iconType="alert"
      size="s"
    >
      <EuiText size="s">{message}</EuiText>
    </EuiCallOut>
  )
);
MigrationsLastError.displayName = 'MigrationsLastError';
