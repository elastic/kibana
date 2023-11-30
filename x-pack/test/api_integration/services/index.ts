/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as commonServices } from '../../common/services';

import { UsageAPIProvider } from './usage_api';

import { IngestManagerProvider } from '../../common/services/ingest_manager';
import { AiopsProvider } from './aiops';
import { IndexManagementProvider } from './index_management';
import { InfraOpsSourceConfigurationProvider } from './infraops_source_configuration';
import { IngestPipelinesProvider } from './ingest_pipelines';
import { MachineLearningProvider } from './ml';
import { TransformProvider } from './transform';

export const services = {
  ...commonServices,
  aiops: AiopsProvider,
  infraOpsSourceConfiguration: InfraOpsSourceConfigurationProvider,
  usageAPI: UsageAPIProvider,
  ml: MachineLearningProvider,
  ingestManager: IngestManagerProvider,
  transform: TransformProvider,
  ingestPipelines: IngestPipelinesProvider,
  indexManagement: IndexManagementProvider,
};
