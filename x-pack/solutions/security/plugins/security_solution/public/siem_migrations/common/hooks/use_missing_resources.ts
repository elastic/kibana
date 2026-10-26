/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { SiemMigrationResourceBase } from '../../../../common/siem_migrations/model/common.gen';
import type { HandleMissingResourcesIndexed, MissingResourcesIndexed } from '../types';
import { MigrationSource } from '../types';

export const useMissingResources = ({
  handleMissingResourcesIndexed,
  migrationSource,
}: {
  handleMissingResourcesIndexed?: HandleMissingResourcesIndexed;
  migrationSource: MigrationSource;
}) => {
  const [missingResourcesIndexed, setMissingResourcesIndexed] = useState<
    MissingResourcesIndexed | undefined
  >();

  const onMissingResourcesFetched = useCallback(
    (missingResources?: SiemMigrationResourceBase[]) => {
      const newMissingResourcesIndexed = missingResources?.reduce<MissingResourcesIndexed>(
        (acc, { type, name }) => {
          if (type === 'macro') {
            acc.macros.push(name);
          } else if (type === 'lookup') {
            acc.lookups.push(name);
          }
          return acc;
        },
        { macros: [], lookups: [] }
      );
      setMissingResourcesIndexed(newMissingResourcesIndexed);

      handleMissingResourcesIndexed?.({
        migrationSource,
        newMissingResourcesIndexed,
      });
    },
    [handleMissingResourcesIndexed, migrationSource]
  );

  const missingResourceCount =
    migrationSource === MigrationSource.QRADAR
      ? missingResourcesIndexed?.lookups.length ?? 0
      : (missingResourcesIndexed?.macros.length ?? 0) +
        (missingResourcesIndexed?.lookups.length ?? 0);

  return { missingResourcesIndexed, onMissingResourcesFetched, missingResourceCount };
};
