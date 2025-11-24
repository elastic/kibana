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
import {
  DataInputStep,
  DataInputStepId,
} from '../../../rules/components/data_input_flyout/steps/constants';
import { RulesDataInput } from '../../../rules/components/data_input_flyout/steps/rules/rules_data_input';
import type { SiemMigrationResourceBase } from '../../../../../common/siem_migrations/model/common.gen';
import type { RuleMigrationStats } from '../../../rules/types';
import { MacrosDataInput } from '../../../rules/components/data_input_flyout/steps/macros/macros_data_input';
import { LookupsDataInput } from '../../../rules/components/data_input_flyout/steps/lookups/lookups_data_input';
import type { QradarMigrationSteps, SplunkMigrationSteps } from './types';

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
  setDataInputStep: (step: DataInputStep) => void;
  dataInputStep: DataInputStep;
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
        setDataInputStep(DataInputStep.Macros);
        return;
      }
      if (newMissingResourcesIndexed.lookups.length) {
        setDataInputStep(DataInputStep.Lookups);
        return;
      }
      setDataInputStep(DataInputStep.End);
    },
    [setDataInputStep]
  );

  const onAllLookupsCreated = useCallback(() => {
    setDataInputStep(DataInputStep.End);
  }, [setDataInputStep]);

  const SPLUNK_MIGRATION_STEPS: SplunkMigrationSteps = useMemo(
    () => [
      {
        id: DataInputStepId.SplunkRules,
        Component: RulesDataInput,
        extraProps: {
          dataInputStep,
          migrationSource,
          migrationStats,
          onMigrationCreated,
          onMissingResourcesFetched,
        },
      },
      {
        id: DataInputStepId.SplunkMacros,
        Component: MacrosDataInput,
        extraProps: {
          dataInputStep,
          onMissingResourcesFetched,
          missingMacros: missingResourcesIndexed?.macros,
          migrationStats,
        },
      },
      {
        id: DataInputStepId.SplunkLookups,
        Component: LookupsDataInput,
        extraProps: {
          dataInputStep,
          onAllLookupsCreated,
          missingLookups: missingResourcesIndexed?.lookups,
          migrationStats,
        },
      },
    ],
    [
      dataInputStep,
      migrationSource,
      migrationStats,
      onMigrationCreated,
      onMissingResourcesFetched,
      missingResourcesIndexed,
      onAllLookupsCreated,
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
  dataInputStep: DataInputStep;
  migrationSource: MigrationSource;
  migrationStats?: RuleMigrationStats;
}): QradarMigrationSteps | null => {
  const onMissingResourcesFetched = useCallback(() => {}, []);
  const QRADAR_MIGRATION_STEPS: QradarMigrationSteps = useMemo(
    () => [
      {
        id: DataInputStepId.QradarRules,
        Component: RulesDataInput,
        extraProps: {
          dataInputStep,
          migrationSource,
          migrationStats,
          onMigrationCreated,
          onMissingResourcesFetched,
        },
      },
    ],
    [dataInputStep, migrationSource, migrationStats, onMigrationCreated, onMissingResourcesFetched]
  );

  return migrationSource === MigrationSource.QRADAR ? QRADAR_MIGRATION_STEPS : null;
};
