/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import type { SiemMigrationTaskStatus } from '../../../common/siem_migrations/constants';
import {
  WorkflowMigrationSource,
  type WorkflowMigrationTaskStats,
} from '../../../common/siem_migrations/workflows/types';
import type { Step } from '../common/types';

export { WorkflowMigrationSource } from '../../../common/siem_migrations/workflows/types';

export const WORKFLOW_MIGRATION_VENDOR_DISPLAY_NAME: Record<WorkflowMigrationSource, string> = {
  [WorkflowMigrationSource.TINES]: 'Tines',
};

export interface WorkflowMigrationStats
  extends Omit<WorkflowMigrationTaskStats, 'status' | 'vendor'> {
  status: SiemMigrationTaskStatus;
  vendor: WorkflowMigrationSource;
}

export enum WorkflowDataInputStep {
  Upload = 1,
  End = 10,
}

export interface WorkflowMigrationStepProps {
  dataInputStep: number;
  migrationSource: WorkflowMigrationSource;
  migrationStats?: WorkflowMigrationStats;
  onMigrationCreated: (createdMigrationStats: WorkflowMigrationStats) => void;
  setDataInputStep: Dispatch<SetStateAction<number>>;
}

export type WorkflowMigrationSteps = Array<Step<WorkflowMigrationStepProps>>;
