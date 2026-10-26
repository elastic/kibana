/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DashboardResourceIdentifier } from '../../../../../../common/siem_migrations/dashboards/resources';
import type { DashboardMigrationDashboard } from '../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { ResourceRetriever } from '../../../common/task/retrievers/resource_retriever';
import type { ResourceRetrieverDeps } from '../../../common/task/retrievers/types';

export class DashboardResourceRetriever extends ResourceRetriever<DashboardMigrationDashboard> {
  constructor(
    protected readonly migrationId: string,
    protected readonly deps: ResourceRetrieverDeps
  ) {
    super(migrationId, DashboardResourceIdentifier, deps);
  }
}
