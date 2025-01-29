/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';

import { services as apiIntegrationServices } from '@kbn/test-suites-xpack/api_integration/services';
import { services as apiIntegrationDeploymentAgnosticServices } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
/*
 * Some FTR services from api integration stateful tests are compatible with serverless environment
 * While adding a new one, make sure to verify that it works on both Kibana CI and MKI
 */
const pickedServices = _.pick(apiIntegrationServices, [
  'deployment',
  'es',
  'esArchiver',
  'esDeleteAllIndices',
  'esSupertest',
  'indexPatterns',
  'ingestPipelines',
  'indexManagement',
  'kibanaServer',
  'ml',
  'randomness',
  'retry',
  'security',
  'usageAPI',
  'console',
  'securitySolutionApi',
]);

export const services = {
  // deployment agnostic FTR services
  ...pickedServices,
  alertingApi: apiIntegrationDeploymentAgnosticServices.alertingApi,
};
