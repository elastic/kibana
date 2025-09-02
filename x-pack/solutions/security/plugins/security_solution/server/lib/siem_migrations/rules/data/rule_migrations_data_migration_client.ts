/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { SiemMigrationsDataMigrationClient } from '../../common/data/siem_migrations_data_migration_client';

export class RuleMigrationsDataMigrationClient extends SiemMigrationsDataMigrationClient<RuleMigration> {
  /**
   * Saves a migration as started.
   *
   * Overloads the `saveAsStarted` method of the SiemMigrationsDataMigrationClient class
   * to receive and store the `skipPrebuiltRulesMatching` value which is specific of rule migrations.
   */
  async saveAsStarted({
    id,
    connectorId,
    skipPrebuiltRulesMatching = false,
  }: {
    id: string;
    connectorId: string;
    skipPrebuiltRulesMatching?: boolean;
  }): Promise<void> {
    await this.updateLastExecution(id, {
      started_at: new Date().toISOString(),
      connector_id: connectorId,
      is_stopped: false,
      error: null,
      finished_at: null,
      skip_prebuilt_rules_matching: skipPrebuiltRulesMatching,
    });
  }
}
