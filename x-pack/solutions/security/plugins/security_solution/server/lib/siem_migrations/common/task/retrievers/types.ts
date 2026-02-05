/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '../../../../../../common';
import type { SiemMigrationsDataResourcesClient } from '../../data/siem_migrations_data_resources_client';

export interface ResourceRetrieverDeps {
  experimentalFeatures: ExperimentalFeatures;
  resourcesDataClient: SiemMigrationsDataResourcesClient;
}
