/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DataInputStepId,
  QradarDataInputStep,
  SplunkDataInputStep,
} from '../../../rules/components/data_input_flyout/steps/constants';
import type { LookupsDataInput } from '../../../rules/components/data_input_flyout/steps/lookups/lookups_data_input';
import type { MacrosDataInput } from '../../../rules/components/data_input_flyout/steps/macros/macros_data_input';
import type { RulesDataInput } from '../../../rules/components/data_input_flyout/steps/rules/rules_data_input';
import type { OnMissingResourcesFetched } from '../../../rules/components/data_input_flyout/types';
import type { RuleMigrationStats } from '../../../rules/types';
import type { MigrationSource } from '../../types';

interface RulesStep<T extends DataInputStepId = DataInputStepId> {
  id: T;
  Component: typeof RulesDataInput;
  extraProps?: React.ComponentProps<typeof RulesDataInput>;
}
interface MacrosStep {
  id: DataInputStepId.SplunkMacros;
  Component: typeof MacrosDataInput;
  extraProps?: React.ComponentProps<typeof MacrosDataInput>;
}
interface LookupsStep {
  id: DataInputStepId.SplunkLookups;
  Component: typeof LookupsDataInput;
  extraProps?: React.ComponentProps<typeof LookupsDataInput>;
}

export type Step<T extends DataInputStepId = DataInputStepId> =
  T extends DataInputStepId.SplunkRules
    ? RulesStep
    : T extends DataInputStepId.QradarRules
    ? RulesStep
    : T extends DataInputStepId.SplunkMacros
    ? MacrosStep
    : LookupsStep;

export type SplunkStep = RulesStep | MacrosStep | LookupsStep;

export type SplunkMigrationSteps = SplunkStep[];

export type QradarMigrationSteps = Array<Step<DataInputStepId.QradarRules>>;

export interface RulesDataInputSubStepsProps {
  dataInputStep: SplunkDataInputStep | QradarDataInputStep;
  migrationSource: MigrationSource;
  migrationStats?: RuleMigrationStats;
  onMigrationCreated: (createdMigrationStats: RuleMigrationStats) => void;
  onMissingResourcesFetched?: OnMissingResourcesFetched;
}
