/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardMigrationDashboard } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import {
  SIEM_MIGRATIONS_MIGRATION_ABORTED,
  SIEM_MIGRATIONS_MIGRATION_FAILURE,
  SIEM_MIGRATIONS_MIGRATION_SUCCESS,
  SIEM_MIGRATIONS_DASHBOARD_TRANSLATION_FAILURE,
  SIEM_MIGRATIONS_DASHBOARD_TRANSLATION_SUCCESS,
  siemMigrationEventNames,
  SiemMigrationsEventTypes,
} from '../../../telemetry/event_based/events/siem_migrations';
import { SiemMigrationTelemetryClient } from '../../common/task/siem_migrations_telemetry_client';

export class DashboardMigrationTelemetryClient extends SiemMigrationTelemetryClient<DashboardMigrationDashboard> {
  public startSiemMigrationTask() {
    const startTime = Date.now();
    const stats = { completed: 0, failed: 0 };

    return {
      startItemTranslation: () => {
        const dashboardStartTime = Date.now();
        return {
          success: (migrationResult: DashboardMigrationDashboard) => {
            stats.completed++;
            this.reportEvent(SIEM_MIGRATIONS_DASHBOARD_TRANSLATION_SUCCESS, {
              migrationId: this.migrationId,
              translationResult: migrationResult.translation_result || '',
              duration: Date.now() - dashboardStartTime,
              model: this.modelName,
              eventName:
                siemMigrationEventNames[SiemMigrationsEventTypes.DashboardTranslationSuccess],
              vendor: this.vendor,
            });
          },
          failure: (error: Error) => {
            stats.failed++;
            this.reportEvent(SIEM_MIGRATIONS_DASHBOARD_TRANSLATION_FAILURE, {
              migrationId: this.migrationId,
              error: error.message,
              model: this.modelName,
              eventName:
                siemMigrationEventNames[SiemMigrationsEventTypes.DashboardTranslationFailure],
              vendor: this.vendor,
            });
          },
        };
      },
      success: () => {
        const duration = Date.now() - startTime;
        this.reportEvent(SIEM_MIGRATIONS_MIGRATION_SUCCESS, {
          migrationId: this.migrationId,
          type: 'dashboards',
          model: this.modelName || '',
          completed: stats.completed,
          failed: stats.failed,
          total: stats.completed + stats.failed,
          duration,
          eventName: siemMigrationEventNames[SiemMigrationsEventTypes.MigrationSuccess],
          vendor: this.vendor,
        });
      },
      failure: (error: Error) => {
        const duration = Date.now() - startTime;
        this.reportEvent(SIEM_MIGRATIONS_MIGRATION_FAILURE, {
          migrationId: this.migrationId,
          type: 'dashboards',
          model: this.modelName || '',
          completed: stats.completed,
          failed: stats.failed,
          total: stats.completed + stats.failed,
          duration,
          error: error.message,
          eventName: siemMigrationEventNames[SiemMigrationsEventTypes.MigrationFailure],
          vendor: this.vendor,
        });
      },
      aborted: (error: Error) => {
        const duration = Date.now() - startTime;
        this.reportEvent(SIEM_MIGRATIONS_MIGRATION_ABORTED, {
          migrationId: this.migrationId,
          type: 'dashboards',
          model: this.modelName || '',
          completed: stats.completed,
          failed: stats.failed,
          total: stats.completed + stats.failed,
          duration,
          reason: error.message,
          eventName: siemMigrationEventNames[SiemMigrationsEventTypes.MigrationAborted],
          vendor: this.vendor,
        });
      },
    };
  }
}
