/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationResourceBase } from '../../../../../common/siem_migrations/model/common.gen';
import type { RuleMigrationStats } from '../../types';
import type { QradarDataInputStep, SplunkDataInputStep } from './steps/constants';
import type { LookupsDataInput } from './steps/lookups/lookups_data_input';
import type { MacrosDataInput } from './steps/macros/macros_data_input';
import type { RulesDataInput } from './steps/rules/rules_data_input';
import type { EnhancementsDataInput } from './steps/enhancements/enhancements_data_input';
import type { SplunkDataInputStepId } from './configs/splunk';
import type { QradarDataInputStepId } from './configs/qradar';
import type { MigrationSource } from '../../../common/types';

export type OnMigrationCreated = (migrationStats: RuleMigrationStats) => void;
export type OnResourcesCreated = () => void;
export type OnMissingResourcesFetched = (missingResources: SiemMigrationResourceBase[]) => void;

type DataInputStepId = SplunkDataInputStepId | QradarDataInputStepId;

export interface Step<Props, C extends React.ComponentType<Props>> {
  id: DataInputStepId;
  Component: C;
  props?: Props;
}

type RulesStep = Step<React.ComponentProps<typeof RulesDataInput>, typeof RulesDataInput>;

type MacrosStep = Step<React.ComponentProps<typeof MacrosDataInput>, typeof MacrosDataInput>;

type LookupsStep = Step<React.ComponentProps<typeof LookupsDataInput>, typeof LookupsDataInput>;

type EnhancementsStep = Step<
  React.ComponentProps<typeof EnhancementsDataInput>,
  typeof EnhancementsDataInput
>;

export type SplunkStep = RulesStep | MacrosStep | LookupsStep;
export type QradarStep = RulesStep | EnhancementsStep;

export type SplunkMigrationSteps = Array<SplunkStep>;
export type QradarMigrationSteps = Array<QradarStep>;

export interface RulesDataInputSubStepsProps {
  dataInputStep: SplunkDataInputStep | QradarDataInputStep;
  migrationSource: MigrationSource;
  migrationStats?: RuleMigrationStats;
  onMigrationCreated: (createdMigrationStats: RuleMigrationStats) => void;
  onMissingResourcesFetched?: OnMissingResourcesFetched;
}
