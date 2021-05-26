/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as kibanaApiIntegrationServices } from '../../../../test/api_integration/services';
import { services as commonServices } from '../../common/services';

// @ts-ignore not ts yet
import { LegacyEsProvider } from './legacy_es';
// @ts-ignore not ts yet
import { EsSupertestWithoutAuthProvider } from './es_supertest_without_auth';
// @ts-ignore not ts yet
import { SupertestWithoutAuthProvider } from './supertest_without_auth';

import { UsageAPIProvider } from './usage_api';

import { InfraOpsSourceConfigurationProvider } from './infraops_source_configuration';
import { InfraLogSourceConfigurationProvider } from './infra_log_source_configuration';
import { MachineLearningProvider } from './ml';
import { IngestManagerProvider } from '../../common/services/ingest_manager';
import { TransformProvider } from './transform';

export const services = {
  ...commonServices,

  esSupertest: kibanaApiIntegrationServices.esSupertest,
  supertest: kibanaApiIntegrationServices.supertest,

  legacyEs: LegacyEsProvider,
  esSupertestWithoutAuth: EsSupertestWithoutAuthProvider,
  infraOpsSourceConfiguration: InfraOpsSourceConfigurationProvider,
  infraLogSourceConfiguration: InfraLogSourceConfigurationProvider,
  supertestWithoutAuth: SupertestWithoutAuthProvider,
  usageAPI: UsageAPIProvider,
  ml: MachineLearningProvider,
  ingestManager: IngestManagerProvider,
  transform: TransformProvider,
};
