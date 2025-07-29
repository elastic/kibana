/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as kibanaApiIntegrationServices } from '@kbn/test-suites-src/api_integration/services';
import { MachineLearningProvider } from '@kbn/test-suites-xpack-platform/api_integration/services/ml';
import { services as commonServices } from '../../common/services';

// @ts-ignore not ts yet
import { EsSupertestWithoutAuthProvider } from './es_supertest_without_auth';

import { UsageAPIProvider } from './usage_api';

import { InfraOpsSourceConfigurationProvider } from './infraops_source_configuration';
import { IngestManagerProvider } from '../../common/services/ingest_manager';
import { IngestPipelinesProvider } from './ingest_pipelines';
import { DataViewApiProvider } from './data_view_api';
import { SloApiProvider } from './slo';
import { SecuritySolutionApiProvider } from './security_solution_api.gen';
import { FleetAndAgents } from './fleet_and_agents';

export const services = {
  ...commonServices,

  esSupertest: kibanaApiIntegrationServices.esSupertest,
  supertest: kibanaApiIntegrationServices.supertest,

  dataViewApi: DataViewApiProvider,
  esSupertestWithoutAuth: EsSupertestWithoutAuthProvider,
  infraOpsSourceConfiguration: InfraOpsSourceConfigurationProvider,
  usageAPI: UsageAPIProvider,
  ml: MachineLearningProvider,
  ingestManager: IngestManagerProvider,
  ingestPipelines: IngestPipelinesProvider,
  slo: SloApiProvider,
  securitySolutionApi: SecuritySolutionApiProvider,
  fleetAndAgents: FleetAndAgents,
};
