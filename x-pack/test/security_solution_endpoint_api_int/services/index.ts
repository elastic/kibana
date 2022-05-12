/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as xPackAPIServices } from '../../api_integration/services';
import { ResolverGeneratorProvider } from './resolver';
import { EndpointTestResources } from '../../security_solution_endpoint/services/endpoint';
import { EndpointPolicyTestResourcesProvider } from '../../security_solution_endpoint/services/endpoint_policy';
import { EndpointArtifactsTestResources } from '../../security_solution_endpoint/services/endpoint_artifacts';

export const services = {
  ...xPackAPIServices,
  resolverGenerator: ResolverGeneratorProvider,
  endpointTestResources: EndpointTestResources,
  endpointPolicyTestResources: EndpointPolicyTestResourcesProvider,
  endpointArtifactTestResources: EndpointArtifactsTestResources,
};
