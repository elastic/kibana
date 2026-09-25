/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowMigrationTaskStats } from '../../../common/siem_migrations/workflows/types';
import type { SiemMigrationTaskStatus } from '../../../common/siem_migrations/constants';
import type { OriginalWorkflowVendor } from '../../../common/siem_migrations/workflows/types';

export interface WorkflowMigrationStats
  extends Omit<WorkflowMigrationTaskStats, 'status' | 'vendor'> {
  status: SiemMigrationTaskStatus; // use the native enum instead of the zod enum from the model
  vendor: OriginalWorkflowVendor;
}
