/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaSupertestWithCertProvider,
  KibanaSupertestWithCertWithoutAuthProvider,
} from '../../../../security_solution_endpoint/services/supertest_with_cert';
import { services as xPackAPIServices } from '../../../../api_integration/services';
import { ResolverGeneratorProvider } from './resolver';
import { RolesUsersProvider } from './roles_users';
import { EndpointTestResources } from '../../../../security_solution_endpoint/services/endpoint';
import { EndpointPolicyTestResourcesProvider } from '../../../../security_solution_endpoint/services/endpoint_policy';
import { EndpointArtifactsTestResources } from '../../../../security_solution_endpoint/services/endpoint_artifacts';
import { SecuritySolutionEndpointDataStreamHelpers } from '../../../../common/services/security_solution/endpoint_data_stream_helpers';
import { SecuritySolutionEndpointRegistryHelpers } from '../../../../common/services/security_solution/endpoint_registry_helpers';

export const services = {
  ...xPackAPIServices,
  resolverGenerator: ResolverGeneratorProvider,
  endpointTestResources: EndpointTestResources,
  endpointPolicyTestResources: EndpointPolicyTestResourcesProvider,
  endpointArtifactTestResources: EndpointArtifactsTestResources,
  rolesUsersProvider: RolesUsersProvider,
  endpointDataStreamHelpers: SecuritySolutionEndpointDataStreamHelpers,
  endpointRegistryHelpers: SecuritySolutionEndpointRegistryHelpers,
};

export const svlServices = {
  ...services,

  supertest: KibanaSupertestWithCertProvider,
  supertestWithoutAuth: KibanaSupertestWithCertWithoutAuthProvider,
};
