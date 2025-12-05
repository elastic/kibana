/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QradarDataInputStepId } from '../components/data_input_flyout/steps/constants';
import { RulesDataInput } from '../components/data_input_flyout/steps/rules/rules_data_input';
import type { QradarMigrationSteps } from '../components/data_input_flyout/types';

export const QRADAR_MIGRATION_STEPS: QradarMigrationSteps = [
  { id: QradarDataInputStepId.Rules, Component: RulesDataInput },
] as const;
