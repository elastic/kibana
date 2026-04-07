/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { DashboardInput } from '../../datasets/dashboards/types';

// These path strings mirror the constants defined in
// security_solution/common/siem_migrations/dashboards/constants.ts.
// They are inlined here to avoid a package→plugin import boundary violation.
const SIEM_DASHBOARD_MIGRATIONS_PATH = '/internal/siem_migrations/dashboards';

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 360; // 30 minutes max (360 * 5s)

export type EvalFetch = (path: string, options?: Record<string, unknown>) => Promise<unknown>;

export interface TranslatedDashboard {
  id: string;
  migration_id: string;
  original_dashboard: { id?: string; title?: string; data?: string };
  elastic_dashboard?: {
    data: string;
    title: string;
    description: string;
  };
  status: string;
  translation_result?: string;
  comments?: string;
}

export interface MigrationResult {
  migrationId: string;
  dashboards: TranslatedDashboard[];
  stats: Record<string, unknown>;
}

interface CreateMigrationResponse {
  migration_id: string;
}

interface MigrationStats {
  status?: string;
  last_execution?: {
    finished_at?: string | null;
  };
  [key: string]: unknown;
}

interface GetDashboardsResponse {
  data?: TranslatedDashboard[];
  [key: string]: unknown;
}

export class DashboardMigrationClient {
  constructor(private readonly fetch: EvalFetch, private readonly log: ToolingLog) {}

  public async migrateDashboard(
    input: DashboardInput,
    connectorId: string
  ): Promise<MigrationResult> {
    // Step 1: Create migration
    const createResponse = (await this.fetch(SIEM_DASHBOARD_MIGRATIONS_PATH, {
      method: 'PUT',
      headers: { 'elastic-api-version': '1' },
      body: JSON.stringify({ name: `eval-${Date.now()}` }),
    })) as CreateMigrationResponse;
    const migrationId = createResponse.migration_id;
    this.log.debug(`[DashboardMigrationClient] Created migration: ${migrationId}`);

    try {
      // Step 2: Upload Splunk dashboard export
      await this.fetch(`${SIEM_DASHBOARD_MIGRATIONS_PATH}/${migrationId}/dashboards`, {
        method: 'POST',
        headers: { 'elastic-api-version': '1' },
        body: JSON.stringify([input.original_dashboard_export]),
      });
      this.log.debug(`[DashboardMigrationClient] Uploaded dashboard for migration: ${migrationId}`);

      // Step 3: Upload macros/lookups (if any)
      if (input.resources.length > 0) {
        await this.fetch(`${SIEM_DASHBOARD_MIGRATIONS_PATH}/${migrationId}/resources`, {
          method: 'POST',
          headers: { 'elastic-api-version': '1' },
          body: JSON.stringify(input.resources),
        });
        this.log.debug(
          `[DashboardMigrationClient] Uploaded ${input.resources.length} resources for migration: ${migrationId}`
        );
      }

      // Step 4: Start migration with connector settings
      await this.fetch(`${SIEM_DASHBOARD_MIGRATIONS_PATH}/${migrationId}/start`, {
        method: 'POST',
        headers: { 'elastic-api-version': '1' },
        body: JSON.stringify({ settings: { connector_id: connectorId } }),
      });
      this.log.debug(`[DashboardMigrationClient] Started migration: ${migrationId}`);

      // Step 5: Poll stats until execution.completed_at is set
      const stats = await this.pollUntilComplete(migrationId);
      this.log.debug(`[DashboardMigrationClient] Migration completed: ${migrationId}`);

      // Step 6: Fetch translated results
      const dashboardsResponse = (await this.fetch(
        `${SIEM_DASHBOARD_MIGRATIONS_PATH}/${migrationId}/dashboards`,
        { method: 'GET', headers: { 'elastic-api-version': '1' } }
      )) as GetDashboardsResponse;

      const dashboards: TranslatedDashboard[] = dashboardsResponse.data ?? [];
      this.log.info(
        `[DashboardMigrationClient] Fetched ${dashboards.length} dashboard(s) for migration ${migrationId}`
      );

      return {
        migrationId,
        dashboards,
        stats,
      };
    } finally {
      // Step 7: Cleanup — delete migration regardless of success or failure
      try {
        await this.fetch(`${SIEM_DASHBOARD_MIGRATIONS_PATH}/${migrationId}`, {
          method: 'DELETE',
          headers: { 'elastic-api-version': '1' },
        });
        this.log.debug(`[DashboardMigrationClient] Deleted migration: ${migrationId}`);
      } catch (cleanupError) {
        this.log.warning(
          `[DashboardMigrationClient] Failed to delete migration ${migrationId}: ${cleanupError}`
        );
      }
    }
  }

  private async pollUntilComplete(migrationId: string): Promise<Record<string, unknown>> {
    for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
      const stats = (await this.fetch(`${SIEM_DASHBOARD_MIGRATIONS_PATH}/${migrationId}/stats`, {
        method: 'GET',
        headers: { 'elastic-api-version': '1' },
      })) as MigrationStats;

      if (stats.status === 'finished' || stats.last_execution?.finished_at) {
        this.log.info(
          `[DashboardMigrationClient] Migration ${migrationId} completed: ${JSON.stringify(stats)}`
        );
        return stats as Record<string, unknown>;
      }

      // Log progress every 6th attempt (every 30s) at info level so it's visible
      if (attempt % 6 === 1 || attempt <= 3) {
        this.log.info(
          `[DashboardMigrationClient] Polling migration ${migrationId} (attempt ${attempt}/${MAX_POLL_ATTEMPTS}): ${JSON.stringify(stats)}`
        );
      }

      if (attempt < MAX_POLL_ATTEMPTS) {
        await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    }

    throw new Error(
      `Migration ${migrationId} did not complete after ${MAX_POLL_ATTEMPTS} poll attempts (${
        (MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 60_000
      } minutes)`
    );
  }
}
