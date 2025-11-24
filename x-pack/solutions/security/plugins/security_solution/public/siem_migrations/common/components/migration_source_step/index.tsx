/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type { MigrationSource } from '../../types';
import { MIGRATIONSOURCE_OPTIONS } from './migration_source_options';

export const useMigrationSourceStep = () => {
  const [migrationSource, setMigrationSource] = useState<MigrationSource>(
    MIGRATIONSOURCE_OPTIONS[0].value
  );
  return {
    migrationSource,
    setMigrationSource,
  };
};
