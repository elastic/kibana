/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { services as xpackApiIntegrationServices } from '../../../test/api_integration/services';

/*
 * Some FTR services from api integration stateful tests are compatible with serverless environment
 * While adding a new one, make sure to verify that it works on both Kibana CI and MKI
 */
const {
  es,
  kibanaServer,
  esArchiver,
  retry,
  randomness,
  security,
  esDeleteAllIndices,
  indexPatterns,
  usageAPI,
  ingestPipelines,
  deployment,
} = xpackApiIntegrationServices;

export const services = {
  // deployment agnostic FTR services
  es,
  kibanaServer,
  esArchiver,
  retry,
  randomness,
  security,
  esDeleteAllIndices,
  indexPatterns,
  usageAPI,
  ingestPipelines,
  deployment,
};
