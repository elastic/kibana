/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { useMigrationSourceOptions } from './use_migration_source_options';
import type { MigrationSource } from '../../../common/types';

export interface MigrationSourceDropdownProps {
  migrationSource: MigrationSource;
  setMigrationSource: (migrationSource: MigrationSource) => void;
  disabled: boolean;
  migrationSourceOptions: Array<EuiSuperSelectOption<MigrationSource>>;
}

export const useMigrationSourceStep = (initialMigrationSource: MigrationSource) => {
  const migrationSourceOptions = useMigrationSourceOptions();
  const [migrationSource, setMigrationSource] = useState<MigrationSource>(initialMigrationSource);
  const [migrationSourceDisabled, setMigrationSourceDisabled] = useState<boolean>(
    migrationSourceOptions.length <= 1
  );
  return {
    migrationSource,
    setMigrationSource,
    migrationSourceDisabled,
    setMigrationSourceDisabled,
    migrationSourceOptions,
  };
};
