/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { services as kibanaApiIntegrationServices } from '../../../../test/api_integration/services';
import { services as kibanaCommonServices } from '../../../../test/common/services';

import { SecurityServiceProvider, SpacesServiceProvider } from '../../common/services';

// @ts-ignore not ts yet
import { EsProvider } from './es';
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

export const services = {
  chance: kibanaApiIntegrationServices.chance,
  esSupertest: kibanaApiIntegrationServices.esSupertest,
  supertest: kibanaApiIntegrationServices.supertest,

  esArchiver: kibanaCommonServices.esArchiver,
  kibanaServer: kibanaCommonServices.kibanaServer,
  retry: kibanaCommonServices.retry,

  es: EsProvider,
  esSupertestWithoutAuth: EsSupertestWithoutAuthProvider,
  infraOpsGraphQLClient: InfraOpsGraphQLClientProvider,
  infraOpsGraphQLClientFactory: InfraOpsGraphQLClientFactoryProvider,
  infraOpsSourceConfiguration: InfraOpsSourceConfigurationProvider,
  security: SecurityServiceProvider,
  siemGraphQLClient: SiemGraphQLClientProvider,
  siemGraphQLClientFactory: SiemGraphQLClientFactoryProvider,
  spaces: SpacesServiceProvider,
  supertestWithoutAuth: SupertestWithoutAuthProvider,
  usageAPI: UsageAPIProvider,
};
