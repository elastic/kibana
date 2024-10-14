/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { services as apiIntegrationServices } from '../../services';

/**
 * Load only services that support both stateful & serverless deployments (including Cloud/MKI),
 * e.g. `randomness` or `retry` are deployment agnostic
 */
export const deploymentAgnosticServices = _.pick(apiIntegrationServices, [
  'supertest', // TODO: review its behaviour
  'es',
  'esDeleteAllIndices', // TODO: review its behaviour
  'esArchiver',
  'esSupertest', // TODO: review its behaviour
  'indexPatterns',
  'ingestPipelines',
  'kibanaServer',
  // 'ml', depends on 'esDeleteAllIndices', can we make it deployment agnostic?
  'randomness',
  'retry',
  'security',
  'usageAPI',
]);
