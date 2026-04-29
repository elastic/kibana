/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Steps } from '../../../../common/types';
import { EnhancementsDataInput } from '../steps/enhancements';
import { RulesDataInput } from '../steps/rules/rules_data_input';
import { ReferenceSetDataInput } from '../steps/reference_set/reference_set_data_input';
import { QradarDataInputStepId } from '../types';

export const QRADAR_MIGRATION_STEPS: Steps = [
  { id: QradarDataInputStepId.Rules, Component: RulesDataInput },
  { id: QradarDataInputStepId.ReferenceSet, Component: ReferenceSetDataInput },
  { id: QradarDataInputStepId.Enhancements, Component: EnhancementsDataInput },
] as const;
