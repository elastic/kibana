/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleResourceIdentifier } from '../../../../../../common/siem_migrations/rules/resources';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { ResourceRetriever } from '../../../common/task/retrievers/resource_retriever';
import type { SiemMigrationsDataResourcesClient } from '../../../common/data/siem_migrations_data_resources_client';

export class RuleResourceRetriever extends ResourceRetriever<RuleMigrationRule> {
  constructor(
    protected readonly migrationId: string,
    protected readonly resourcesDataClient: SiemMigrationsDataResourcesClient
  ) {
    super(migrationId, resourcesDataClient, RuleResourceIdentifier);
  }
}
