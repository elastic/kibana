/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { services as xPackFunctionalServices } from '../../functional/services';
import { EndpointPolicyTestResourcesProvider } from './endpoint_policy';
import { IngestManagerProvider } from '../../common/services/ingest_manager';

export const services = {
  ...xPackFunctionalServices,
  policyTestResources: EndpointPolicyTestResourcesProvider,
  ingestManager: IngestManagerProvider,
};
