/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { SiemMigrationResourceBase } from '../../../../../../../common/siem_migrations/model/common.gen';
import type {
  MigrationStepProps,
  MissingResourcesIndexed,
  MigrationSource,
} from '../../../../../common/types';

export const useMissingResources = ({
  setDataInputStep,
  migrationSource,
  handleMissingResourcesIndexed,
}: {
  setDataInputStep: MigrationStepProps['setDataInputStep'];
  migrationSource?: MigrationSource;
  handleMissingResourcesIndexed: (newMissingResourcesIndexed: MissingResourcesIndexed) => void;
}) => {
  const [missingResourcesIndexed, setMissingResourcesIndexed] = useState<
    MissingResourcesIndexed | undefined
  >();

  const onMissingResourcesFetched = useCallback(
    (missingResources: SiemMigrationResourceBase[]) => {
      const newMissingResourcesIndexed = missingResources.reduce<MissingResourcesIndexed>(
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

      handleMissingResourcesIndexed?.(newMissingResourcesIndexed);
    },
    [handleMissingResourcesIndexed]
  );

  return { missingResourcesIndexed, onMissingResourcesFetched };
};
