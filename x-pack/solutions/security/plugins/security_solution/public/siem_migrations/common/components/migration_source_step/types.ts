/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataInputStepId } from '../../../rules/components/data_input_flyout/steps/constants';
import type { LookupsDataInput } from '../../../rules/components/data_input_flyout/steps/lookups/lookups_data_input';
import type { MacrosDataInput } from '../../../rules/components/data_input_flyout/steps/macros/macros_data_input';
import type { RulesDataInput } from '../../../rules/components/data_input_flyout/steps/rules/rules_data_input';

interface RulesStep<T extends DataInputStepId = DataInputStepId> {
  id: T;
  Component: typeof RulesDataInput;
  extraProps: React.ComponentProps<typeof RulesDataInput>;
}
interface MacrosStep {
  id: DataInputStepId.SplunkMacros;
  Component: typeof MacrosDataInput;
  extraProps: React.ComponentProps<typeof MacrosDataInput>;
}
interface LookupsStep {
  id: DataInputStepId.SplunkLookups;
  Component: typeof LookupsDataInput;
  extraProps: React.ComponentProps<typeof LookupsDataInput>;
}

export type Step<T extends DataInputStepId = DataInputStepId> =
  T extends DataInputStepId.SplunkRules
    ? RulesStep
    : T extends DataInputStepId.QradarRules
    ? RulesStep
    : T extends DataInputStepId.SplunkMacros
    ? MacrosStep
    : LookupsStep;

export type SplunkMigrationSteps = [
  Step<DataInputStepId.SplunkRules>,
  Step<DataInputStepId.SplunkMacros>,
  Step<DataInputStepId.SplunkLookups>
];

export type QradarMigrationSteps = [Step<DataInputStepId.QradarRules>];
