/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo, useState } from 'react';

import type { SiemMigrationResourceBase } from '../../../../../common/siem_migrations/model/common.gen';

import type {
  DataInputStep,
  QradarDataInputStep,
} from '../../../rules/components/data_input_flyout/steps/constants';
import { SplunkDataInputStep } from '../../../rules/components/data_input_flyout/steps/constants';

import { STEP_COMPONENTS } from './configs';

import type { RuleMigrationStats } from '../../../rules/types';
import { MigrationSource } from '../../../rules/types';
import type { OnMissingResourcesFetched } from '../../../rules/components/data_input_flyout/types';
import type { QradarMigrationSteps, QradarStep, SplunkMigrationSteps, SplunkStep } from './types';

export interface RulesDataInputSubStepsProps {
  dataInputStep: SplunkDataInputStep | QradarDataInputStep;
  migrationSource: MigrationSource;
  migrationStats?: RuleMigrationStats;
  onMigrationCreated: (createdMigrationStats: RuleMigrationStats) => void;
  onMissingResourcesFetched?: OnMissingResourcesFetched;
}

export type UseMigrationStepsProps = Omit<RulesDataInputSubStepsProps, 'dataInputStep'> & {
  dataInputStep: DataInputStep;
  setMigrationDataInputStep: (step: SplunkDataInputStep | QradarDataInputStep) => void;
};

interface UseSplunkMigrationSteps extends Omit<UseMigrationStepsProps, 'dataInputStep'> {
  dataInputStep: SplunkDataInputStep;
}

interface UseQradarMigrationSteps extends Omit<UseMigrationStepsProps, 'dataInputStep'> {
  dataInputStep: QradarDataInputStep;
}

interface MissingResourcesIndexed {
  macros: string[];
  lookups: string[];
}

const useSplunkMigrationSteps = ({
  setMigrationDataInputStep,
  dataInputStep,
  migrationSource,
  migrationStats,
  onMigrationCreated,
}: UseSplunkMigrationSteps): SplunkMigrationSteps | null => {
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

  const onAllLookupsCreated = useCallback(() => {
    setMigrationDataInputStep(SplunkDataInputStep.End);
  }, [setMigrationDataInputStep]);

  const SPLUNK_MIGRATION_STEPS: SplunkMigrationSteps = useMemo(
    () =>
      STEP_COMPONENTS[MigrationSource.SPLUNK].map(({ id, Component }: SplunkStep) => ({
        id,
        Component,
        props: {
          dataInputStep,
          migrationSource,
          migrationStats,
          missingLookups: missingResourcesIndexed?.lookups,
          missingMacros: missingResourcesIndexed?.macros,
          onAllLookupsCreated,
          onMissingResourcesFetched,
          onMigrationCreated,
        },
      })) as SplunkMigrationSteps,
    [
      dataInputStep,
      migrationSource,
      migrationStats,
      onMigrationCreated,
      missingResourcesIndexed,
      onAllLookupsCreated,
      onMissingResourcesFetched,
    ]
  );

  return migrationSource === MigrationSource.SPLUNK ? SPLUNK_MIGRATION_STEPS : null;
};

const useQradarMigrationSteps = ({
  onMigrationCreated,
  dataInputStep,
  migrationSource,
  migrationStats,
}: UseQradarMigrationSteps): QradarMigrationSteps | null => {
  const QRADAR_MIGRATION_STEPS: QradarMigrationSteps = useMemo(
    () =>
      STEP_COMPONENTS[MigrationSource.QRADAR].map(({ id, Component }: QradarStep) => ({
        id,
        Component,
        props: {
          dataInputStep,
          migrationSource,
          migrationStats,
          onMigrationCreated,
        },
      })),
    [dataInputStep, migrationSource, migrationStats, onMigrationCreated]
  );

  return migrationSource === MigrationSource.QRADAR ? QRADAR_MIGRATION_STEPS : null;
};

export const useMigrationSteps = (
  props: UseMigrationStepsProps
): SplunkMigrationSteps | QradarMigrationSteps | null => {
  const splunkMigrationSteps: SplunkMigrationSteps | null = useSplunkMigrationSteps({
    ...props,
    dataInputStep: props.dataInputStep[MigrationSource.SPLUNK],
  });

  const qradarMigrationSteps: QradarMigrationSteps | null = useQradarMigrationSteps({
    ...props,
    dataInputStep: props.dataInputStep[MigrationSource.QRADAR],
  });

  return splunkMigrationSteps ?? qradarMigrationSteps;
};
