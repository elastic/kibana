/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowMigrationSteps } from '../../../types';
import { TinesDataInput } from '../steps/tines/tines_data_input';

export enum TinesDataInputStepId {
  Upload = 'tines_upload',
}

export const TINES_UPLOAD_STEPS: WorkflowMigrationSteps = [
  { id: TinesDataInputStepId.Upload, Component: TinesDataInput },
] as const;
