/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowMigrationSource, type WorkflowMigrationSteps } from '../../../types';
import { TINES_UPLOAD_STEPS } from './tines';

export const WORKFLOW_UPLOAD_COMPONENTS: Record<WorkflowMigrationSource, WorkflowMigrationSteps> = {
  [WorkflowMigrationSource.TINES]: TINES_UPLOAD_STEPS,
};
