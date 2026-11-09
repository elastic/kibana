/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SiemMigrationVendor } from '../../../../../common/siem_migrations/model/common.gen';
import type { WorkflowMigrationWorkflow } from '../../../../../common/siem_migrations/model/workflow_migration.gen';
import { SiemMigrationsDataItemClient } from '../../common/data/siem_migrations_data_item_client';
import type { SiemMigrationFilters } from '../../../../../common/siem_migrations/types';
import type { SiemMigrationSort } from '../../common/data/types';
import { dsl } from './dsl_queries';
import { getSortingOptions } from './sort';

export class WorkflowMigrationsDataWorkflowsClient extends SiemMigrationsDataItemClient<WorkflowMigrationWorkflow> {
  protected type = 'workflow' as const;

  protected getSortOptions(sort: SiemMigrationSort = {}): estypes.Sort {
    return getSortingOptions(sort);
  }

  /** Returns `tines` when the migration has at least one stored story. */
  public async getVendor(migrationId: string): Promise<SiemMigrationVendor | undefined> {
    const { data: workflows } = await this.get(migrationId, { size: 1 });
    return workflows.length > 0 ? workflows[0].original_workflow.vendor : undefined;
  }

  protected getFilterQuery(
    migrationId: string,
    filters: SiemMigrationFilters = {}
  ): { bool: { filter: QueryDslQueryContainer[] } } {
    const { filter } = super.getFilterQuery(migrationId, filters).bool;

    if (filters.searchTerm?.length) {
      filter.push(dsl.matchTitle(filters.searchTerm));
    }

    if (filters.installed != null) {
      filter.push(filters.installed ? dsl.isInstalled() : dsl.isNotInstalled());
    }

    return { bool: { filter } };
  }
}
