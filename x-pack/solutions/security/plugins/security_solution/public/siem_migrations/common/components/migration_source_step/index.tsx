/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type { MigrationSource } from '../../types';

export const useMigrationSourceStep = (initialMigrationSource: MigrationSource) => {
  const [migrationSource, setMigrationSource] = useState<MigrationSource>(initialMigrationSource);
  const [migrationSourceDisabled, setMigrationSourceDisabled] = useState<boolean>(false);
  return {
    migrationSource,
    setMigrationSource,
    migrationSourceDisabled,
    setMigrationSourceDisabled,
  };
};
