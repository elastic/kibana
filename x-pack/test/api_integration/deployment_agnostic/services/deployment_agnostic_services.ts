/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';

import { services as apiIntegrationServices } from '../../services';

/**
 * List only services that support both stateful & serverless deployments (including Cloud/MKI),
 * e.g. `supertest` has multiple implementations and not compatible.
 */
const services = _.pick(apiIntegrationServices, [
  'supertest', // TODO: review its behaviour
  'esSupertest', // TODO: review its behaviour
  'deployment',
  'es',
  'esArchiver',
  'esDeleteAllIndices',
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

export const deploymentAgnosticServices = {
  ...services,
};
