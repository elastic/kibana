/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecuritySolutionApiProvider as DetectionsApiProvider } from '@kbn/security-solution-test-api-clients/supertest/detections.gen';
import { SecuritySolutionApiProvider as EntityAnalyticsApiProvider } from '@kbn/security-solution-test-api-clients/supertest/entity_analytics.gen';
import { SecuritySolutionApiProvider as ExceptionsApiProvider } from '@kbn/security-solution-test-api-clients/supertest/exceptions.gen';
import { services as kibanaApiIntegrationServices } from '@kbn/test-suites-src/api_integration/services';
import { services as commonServices } from '../../common/services';

// @ts-ignore not ts yet
import { EsSupertestWithoutAuthProvider } from './es_supertest_without_auth';

import { UsageAPIProvider } from './usage_api';

import { AiopsProvider } from './aiops';
import { InfraOpsSourceConfigurationProvider } from './infraops_source_configuration';
import { MachineLearningProvider } from './ml';
import { IngestManagerProvider } from '../../common/services/ingest_manager';
import { TransformProvider } from './transform';
import { IngestPipelinesProvider } from './ingest_pipelines';
import { IndexManagementProvider } from './index_management';
import { DataViewApiProvider } from './data_view_api';
import { SloApiProvider } from './slo';
import { FleetAndAgents } from './fleet_and_agents';

export const services = {
  ...commonServices,

  esSupertest: kibanaApiIntegrationServices.esSupertest,
  supertest: kibanaApiIntegrationServices.supertest,

  aiops: AiopsProvider,
  dataViewApi: DataViewApiProvider,
  esSupertestWithoutAuth: EsSupertestWithoutAuthProvider,
  infraOpsSourceConfiguration: InfraOpsSourceConfigurationProvider,
  usageAPI: UsageAPIProvider,
  ml: MachineLearningProvider,
  ingestManager: IngestManagerProvider,
  transform: TransformProvider,
  ingestPipelines: IngestPipelinesProvider,
  indexManagement: IndexManagementProvider,
  slo: SloApiProvider,
  fleetAndAgents: FleetAndAgents,
  detectionsApi: DetectionsApiProvider,
  exceptionsApi: ExceptionsApiProvider,
  entityAnalyticsApi: EntityAnalyticsApiProvider,
};
