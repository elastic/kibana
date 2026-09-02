/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { estypes } from '@elastic/elasticsearch';
import type { SiemMigrationVendor } from '../../../../../common/siem_migrations/model/common.gen';
import type { WorkflowMigrationWorkflow } from '../../../../../common/siem_migrations/workflows/types';
import { SiemMigrationsDataItemClient } from '../../common/data/siem_migrations_data_item_client';
import type { SiemMigrationSort } from '../../common/data/types';
import { getSortingOptions } from './sort';

export class WorkflowMigrationsDataWorkflowsClient extends SiemMigrationsDataItemClient<WorkflowMigrationWorkflow> {
  protected type = 'workflow' as const;

  protected getSortOptions(sort: SiemMigrationSort = {}): estypes.Sort {
    return getSortingOptions(sort);
  }

  public async getVendor(migrationId: string): Promise<SiemMigrationVendor | undefined> {
    const { data: workflows } = await this.get(migrationId, { size: 1 });
    // POC: 'tines' is not in the generated SiemMigrationVendor enum yet
    return workflows.length > 0
      ? (workflows[0].original_workflow.vendor as unknown as SiemMigrationVendor)
      : undefined;
  }

  protected getFilterQuery(
    migrationId: string,
    filters: { searchTerm?: string } = {}
  ): { bool: { filter: QueryDslQueryContainer[] } } {
    const { filter } = super.getFilterQuery(migrationId, filters).bool;

    if (filters.searchTerm?.length) {
      filter.push({
        match: { 'original_workflow.title': { query: filters.searchTerm } },
      });
    }

    return { bool: { filter } };
  }
}
