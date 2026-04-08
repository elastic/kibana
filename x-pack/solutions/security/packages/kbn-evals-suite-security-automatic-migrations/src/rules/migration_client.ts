/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';

// These path strings mirror the constants defined in
// security_solution/common/siem_migrations/rules/constants.ts.
// They are inlined here to avoid a package→plugin import boundary violation.
const SIEM_RULE_MIGRATIONS_PATH = '/internal/siem_migrations/rules';

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 360; // 30 minutes max (360 * 5s)

export type EvalFetch = (path: string, options?: Record<string, unknown>) => Promise<unknown>;

export interface MigratedRule {
  id: string;
  migration_id: string;
  original_rule: {
    id: string;
    vendor: 'splunk' | 'qradar';
    title: string;
    description: string;
    query: string;
    query_language: string;
  };
  elastic_rule?: {
    title: string;
    description?: string;
    severity?: string;
    risk_score?: number;
    query?: string;
    query_language?: 'esql';
    prebuilt_rule_id?: string | null;
    integration_ids?: string[];
  };
  translation_result?: 'full' | 'partial' | 'untranslatable';
  status: string;
  comments?: Array<{ message: string; created_at: string; created_by: string }>;
}

export interface RuleMigrationResult {
  migrationId: string;
  rule: MigratedRule;
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

interface GetRulesResponse {
  data?: MigratedRule[];
  [key: string]: unknown;
}

export class RuleMigrationClient {
  constructor(private readonly fetch: EvalFetch, private readonly log: ToolingLog) {}

  public async migrateRule(
    input: { original_rule: Record<string, unknown>; resources: Array<Record<string, unknown>> },
    connectorId: string
  ): Promise<RuleMigrationResult> {
    // Step 1: Create migration
    const createResponse = (await this.fetch(SIEM_RULE_MIGRATIONS_PATH, {
      method: 'PUT',
      headers: { 'elastic-api-version': '1' },
      body: JSON.stringify({ name: `eval-rule-${Date.now()}` }),
    })) as CreateMigrationResponse;
    const migrationId = createResponse.migration_id;
    this.log.debug(`[RuleMigrationClient] Created migration: ${migrationId}`);

    try {
      // Step 2: Upload original rule
      await this.fetch(`${SIEM_RULE_MIGRATIONS_PATH}/${migrationId}/rules`, {
        method: 'POST',
        headers: { 'elastic-api-version': '1' },
        body: JSON.stringify([input.original_rule]),
      });
      this.log.debug(`[RuleMigrationClient] Uploaded rule for migration: ${migrationId}`);

      // Step 3: Upload resources (if any)
      if (input.resources.length > 0) {
        await this.fetch(`${SIEM_RULE_MIGRATIONS_PATH}/${migrationId}/resources`, {
          method: 'POST',
          headers: { 'elastic-api-version': '1' },
          body: JSON.stringify(input.resources),
        });
        this.log.debug(
          `[RuleMigrationClient] Uploaded ${input.resources.length} resources for migration: ${migrationId}`
        );
      }

      // Step 4: Start migration with connector settings
      await this.fetch(`${SIEM_RULE_MIGRATIONS_PATH}/${migrationId}/start`, {
        method: 'POST',
        headers: { 'elastic-api-version': '1' },
        body: JSON.stringify({ settings: { connector_id: connectorId } }),
      });
      this.log.debug(`[RuleMigrationClient] Started migration: ${migrationId}`);

      // Step 5: Poll stats until execution.finished_at is set
      const stats = await this.pollUntilComplete(migrationId);
      this.log.debug(`[RuleMigrationClient] Migration completed: ${migrationId}`);

      // Step 6: Fetch translated rule
      const rulesResponse = (await this.fetch(`${SIEM_RULE_MIGRATIONS_PATH}/${migrationId}/rules`, {
        method: 'GET',
        headers: { 'elastic-api-version': '1' },
      })) as GetRulesResponse;

      const rules: MigratedRule[] = rulesResponse.data ?? [];
      this.log.info(
        `[RuleMigrationClient] Fetched ${rules.length} rule(s) for migration ${migrationId}`
      );

      return {
        migrationId,
        rule: rules[0],
        stats,
      };
    } finally {
      // Step 7: Cleanup — delete migration regardless of success or failure
      try {
        await this.fetch(`${SIEM_RULE_MIGRATIONS_PATH}/${migrationId}`, {
          method: 'DELETE',
          headers: { 'elastic-api-version': '1' },
        });
        this.log.debug(`[RuleMigrationClient] Deleted migration: ${migrationId}`);
      } catch (cleanupError) {
        this.log.warning(
          `[RuleMigrationClient] Failed to delete migration ${migrationId}: ${cleanupError}`
        );
      }
    }
  }

  private async pollUntilComplete(migrationId: string): Promise<Record<string, unknown>> {
    for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
      const stats = (await this.fetch(`${SIEM_RULE_MIGRATIONS_PATH}/${migrationId}/stats`, {
        method: 'GET',
        headers: { 'elastic-api-version': '1' },
      })) as MigrationStats;

      if (stats.status === 'finished' || stats.last_execution?.finished_at) {
        this.log.info(
          `[RuleMigrationClient] Migration ${migrationId} completed: ${JSON.stringify(stats)}`
        );
        return stats as Record<string, unknown>;
      }

      // Log progress every 6th attempt (every 30s) at info level so it's visible
      if (attempt % 6 === 1 || attempt <= 3) {
        this.log.info(
          `[RuleMigrationClient] Polling migration ${migrationId} (attempt ${attempt}/${MAX_POLL_ATTEMPTS}): ${JSON.stringify(
            stats
          )}`
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
