/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { SiemMigrationResourceBase } from '../../../../../../../common/siem_migrations/model/common.gen';
import type { QradarDataInputStep } from '../constants';
import { SplunkDataInputStep } from '../constants';

interface MissingResourcesIndexed {
  macros: string[];
  lookups: string[];
}

export const useMissingResources = ({
  setMigrationDataInputStep,
}: {
  setMigrationDataInputStep: (step: SplunkDataInputStep | QradarDataInputStep) => void;
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
      if (newMissingResourcesIndexed.macros.length) {
        setMigrationDataInputStep(SplunkDataInputStep.Macros);
        return;
      }
      if (newMissingResourcesIndexed.lookups.length) {
        setMigrationDataInputStep(SplunkDataInputStep.Lookups);
        return;
      }
      setMigrationDataInputStep(SplunkDataInputStep.End);
    },
    [setMigrationDataInputStep]
  );

  return { missingResourcesIndexed, onMissingResourcesFetched };
};
