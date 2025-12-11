/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { SiemMigrationResourceBase } from '../../../../../../../common/siem_migrations/model/common.gen';
import type { MigrationStepProps, MissingResourcesIndexed } from '../../../../../common/types';
import { SplunkDataInputStep } from '../../../../../common/types';
import { QradarDataInputStep } from '../../types';
import type { ResourceType } from '../../../../types';

export const useMissingResources = ({
  setDataInputStep,
  resourceType,
}: {
  setDataInputStep: MigrationStepProps['setDataInputStep'];
  resourceType?: ResourceType;
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

      if (resourceType === 'reference_data') {
        if (newMissingResourcesIndexed.lookups.length) {
          setDataInputStep(QradarDataInputStep.ReferenceSet);
          return;
        }

        setDataInputStep(QradarDataInputStep.End);
        return;
      }

      if (newMissingResourcesIndexed.macros.length) {
        setDataInputStep(SplunkDataInputStep.Macros);
        return;
      }

      if (newMissingResourcesIndexed.lookups.length) {
        setDataInputStep(SplunkDataInputStep.Lookups);
        return;
      }

      setDataInputStep(SplunkDataInputStep.End);
    },
    [setDataInputStep, resourceType]
  );

  return { missingResourcesIndexed, onMissingResourcesFetched };
};
