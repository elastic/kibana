/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowMigrationWorkflow } from '../../../../../common/siem_migrations/model/workflow_migration.gen';
import { SiemMigrationTelemetryClient } from '../../common/task/siem_migrations_telemetry_client';

export class WorkflowMigrationTelemetryClient extends SiemMigrationTelemetryClient<WorkflowMigrationWorkflow> {
  public startSiemMigrationTask() {
    // Workflow event types are not registered yet. The task runner still calls these hooks.
    return {
      startItemTranslation: () => ({
        success: (_migrationResult: WorkflowMigrationWorkflow) => {},
        failure: (_error: Error) => {},
      }),
      success: () => {},
      failure: (_error: Error) => {},
      aborted: (_error: Error) => {},
    };
  }
}
