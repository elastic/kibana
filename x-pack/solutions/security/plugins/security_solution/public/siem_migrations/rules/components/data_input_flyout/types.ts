/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationResourceBase } from '../../../../../common/siem_migrations/model/common.gen';
import type { MigrationSource, RuleMigrationStats } from '../../types';
import type { QradarDataInputStepId, SplunkDataInputStepId } from './steps/constants';

export type OnMigrationCreated = (migrationStats: RuleMigrationStats) => void;
export type OnResourcesCreated = () => void;
export type OnMissingResourcesFetched = (missingResources: SiemMigrationResourceBase[]) => void;

type DataInputStepId = SplunkDataInputStepId | QradarDataInputStepId;

interface MissingResourcesIndexed {
  macros: string[];
  lookups: string[];
}

export interface UseMigrationStepsProps {
  dataInputStep: number;
  migrationSource: MigrationSource;
  migrationStats?: RuleMigrationStats;
  onMigrationCreated: (createdMigrationStats: RuleMigrationStats) => void;
  onMissingResourcesFetched: OnMissingResourcesFetched;
  setDataInputStep: (step: number) => void;
  missingResourcesIndexed?: MissingResourcesIndexed;
}

export interface Step<
  Props = UseMigrationStepsProps,
  C extends React.ComponentType<Props> = React.ComponentType<Props>
> {
  id: DataInputStepId;
  Component: C;
}

export type Steps = Array<Step>;

export interface RulesDataInputSubStepsProps {
  dataInputStep: number;
  migrationSource: MigrationSource;
  migrationStats?: RuleMigrationStats;
  onMigrationCreated: (createdMigrationStats: RuleMigrationStats) => void;
  onMissingResourcesFetched?: OnMissingResourcesFetched;
}
