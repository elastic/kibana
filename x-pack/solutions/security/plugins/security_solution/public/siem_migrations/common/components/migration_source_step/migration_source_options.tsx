/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { MigrationSource } from '../../types';
import * as i18n from './translations';
import type {
  DataInputStep,
  QradarDataInputStep,
} from '../../../rules/components/data_input_flyout/steps/constants';
import { SplunkDataInputStep } from '../../../rules/components/data_input_flyout/steps/constants';
import type { SiemMigrationResourceBase } from '../../../../../common/siem_migrations/model/common.gen';
import type { RuleMigrationStats } from '../../../rules/types';
import type { QradarMigrationSteps, SplunkMigrationSteps } from './types';
import { STEP_COMPONENTS } from '../migration_steps/configs';

export const MIGRATIONSOURCE_OPTIONS: Array<EuiSuperSelectOption<MigrationSource>> = [
  {
    value: MigrationSource.SPLUNK,
    inputDisplay: <span>{i18n.MIGRATION_SOURCE_DROPDOWN_OPTION_SPLUNK}</span>,
  },
  {
    value: MigrationSource.QRADAR,
    inputDisplay: (
      <span>
        {i18n.MIGRATION_SOURCE_DROPDOWN_OPTION_QRADAR}
        <EuiIcon type="flask" />
      </span>
    ),
  },
];

interface MissingResourcesIndexed {
  macros: string[];
  lookups: string[];
}

export const useSplunkMigrationSteps = ({
  setDataInputStep,
  dataInputStep,
  migrationSource,
  migrationStats,
  onMigrationCreated,
}: {
  setDataInputStep: (step: SplunkDataInputStep) => void;
  dataInputStep: SplunkDataInputStep;
  migrationSource: MigrationSource;
  migrationStats?: RuleMigrationStats;
  onMigrationCreated: (createdMigrationStats: RuleMigrationStats) => void;
}): SplunkMigrationSteps | null => {
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
        setDataInputStep(SplunkDataInputStep.Macros);
        return;
      }
      if (newMissingResourcesIndexed.lookups.length) {
        setDataInputStep(SplunkDataInputStep.Lookups);
        return;
      }
      setDataInputStep(SplunkDataInputStep.End);
    },
    [setDataInputStep]
  );

  const onAllLookupsCreated = useCallback(() => {
    setDataInputStep(SplunkDataInputStep.End);
  }, [setDataInputStep]);

  const SPLUNK_MIGRATION_STEPS: SplunkMigrationSteps = useMemo(
    () =>
      STEP_COMPONENTS[MigrationSource.SPLUNK].map(({ id, Component }) => ({
        id,
        Component,
        extraProps: {
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

export const useQradarMigrationSteps = ({
  onMigrationCreated,
  dataInputStep,
  migrationSource,
  migrationStats,
}: {
  onMigrationCreated: (createdMigrationStats: RuleMigrationStats) => void;
  dataInputStep: QradarDataInputStep;
  migrationSource: MigrationSource;
  migrationStats?: RuleMigrationStats;
}): QradarMigrationSteps | null => {
  const QRADAR_MIGRATION_STEPS: QradarMigrationSteps = useMemo(
    () =>
      STEP_COMPONENTS[MigrationSource.QRADAR].map(({ id, Component }) => ({
        id,
        Component,
        extraProps: {
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

interface UseMigrationStepsParams {
  onMigrationCreated: (createdMigrationStats: RuleMigrationStats) => void;
  dataInputStep: DataInputStep;
  migrationSource: MigrationSource;
  migrationStats?: RuleMigrationStats;
  setMigrationDataInputStep: (step: SplunkDataInputStep | QradarDataInputStep) => void;
}

export const useMigrationSteps = ({
  onMigrationCreated,
  dataInputStep,
  migrationSource,
  migrationStats,
  setMigrationDataInputStep: setDataInputStep,
}: UseMigrationStepsParams): SplunkMigrationSteps | QradarMigrationSteps | null => {
  const splunkMigrationSteps: SplunkMigrationSteps | null = useSplunkMigrationSteps({
    setDataInputStep,
    dataInputStep: dataInputStep[MigrationSource.SPLUNK],
    migrationSource,
    migrationStats,
    onMigrationCreated,
  });

  const qradarMigrationSteps: QradarMigrationSteps | null = useQradarMigrationSteps({
    dataInputStep: dataInputStep[MigrationSource.QRADAR],
    migrationSource,
    migrationStats,
    onMigrationCreated,
  });

  return splunkMigrationSteps ?? qradarMigrationSteps;
};
