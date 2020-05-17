/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { services as kibanaApiIntegrationServices } from '../../../../test/api_integration/services';
import { services as commonServices } from '../../common/services';

// @ts-ignore not ts yet
import { LegacyEsProvider } from './legacy_es';
// @ts-ignore not ts yet
import { EsSupertestWithoutAuthProvider } from './es_supertest_without_auth';
// @ts-ignore not ts yet
import { SupertestWithoutAuthProvider } from './supertest_without_auth';
// @ts-ignore not ts yet
import { UsageAPIProvider } from './usage_api';
import {
  InfraOpsGraphQLClientProvider,
  InfraOpsGraphQLClientFactoryProvider,
} from './infraops_graphql_client';
import { SiemGraphQLClientProvider, SiemGraphQLClientFactoryProvider } from './siem_graphql_client';
import { InfraOpsSourceConfigurationProvider } from './infraops_source_configuration';
import { InfraLogSourceConfigurationProvider } from './infra_log_source_configuration';
import { MachineLearningProvider } from './ml';
import { IngestManagerProvider } from './ingest_manager';

export const services = {
  ...commonServices,

  esSupertest: kibanaApiIntegrationServices.esSupertest,
  supertest: kibanaApiIntegrationServices.supertest,

  legacyEs: LegacyEsProvider,
  esSupertestWithoutAuth: EsSupertestWithoutAuthProvider,
  infraOpsGraphQLClient: InfraOpsGraphQLClientProvider,
  infraOpsGraphQLClientFactory: InfraOpsGraphQLClientFactoryProvider,
  infraOpsSourceConfiguration: InfraOpsSourceConfigurationProvider,
  infraLogSourceConfiguration: InfraLogSourceConfigurationProvider,
  siemGraphQLClient: SiemGraphQLClientProvider,
  siemGraphQLClientFactory: SiemGraphQLClientFactoryProvider,
  supertestWithoutAuth: SupertestWithoutAuthProvider,
  usageAPI: UsageAPIProvider,
  ml: MachineLearningProvider,
  ingestManager: IngestManagerProvider,
};
