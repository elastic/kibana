/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// TODO: move resource related types to migration.gen.ts
import type { RuleMigrationResourceBase } from '../../model/rule_migration.gen';
import type { DashboardMigrationDashboard } from '../../model/dashboard_migration.gen';
import { ResourceIdentifier } from '../../resources/resource_identifier';
import type { SiemMigrationVendor } from '../../types';

export class DashboardResourceIdentifier extends ResourceIdentifier<DashboardMigrationDashboard> {
  protected getVendor(): SiemMigrationVendor {
    return this.item.original_dashboard.vendor;
  }

  public fromOriginal(rule?: DashboardMigrationDashboard): RuleMigrationResourceBase[] {
    const originalDashboard = rule?.original_dashboard ?? this.item.original_dashboard;
    const queries: string[] = []; // TODO: Parse the originalDashboard to extract the queries
    return queries.flatMap((query) => this.identifier(query));
  }
}
