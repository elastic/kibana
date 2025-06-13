/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointTestResources } from '@kbn/test-suites-xpack/security_solution_endpoint/services/endpoint';
import { EndpointArtifactsTestResources } from '@kbn/test-suites-xpack/security_solution_endpoint/services/endpoint_artifacts';
import { EndpointPolicyTestResourcesProvider } from '@kbn/test-suites-xpack/security_solution_endpoint/services/endpoint_policy';

import {
  SecuritySolutionEndpointDataStreamHelpers,
  SecuritySolutionEndpointRegistryHelpers,
} from '@kbn/test-suites-xpack/common/services/security_solution';
import { services as xPackAPIServices } from '../../../api_integration/services';
import { ResolverGeneratorProvider } from '../services/security_solution_edr_workflows_resolver';
import { RolesUsersProvider } from '../services/security_solution_edr_workflows_roles_users';
import { SecuritySolutionESSUtils } from '../services/security_solution_ess_utils';

export const services = {
  ...xPackAPIServices,
  resolverGenerator: ResolverGeneratorProvider,
  endpointTestResources: EndpointTestResources,
  endpointPolicyTestResources: EndpointPolicyTestResourcesProvider,
  endpointArtifactTestResources: EndpointArtifactsTestResources,
  rolesUsersProvider: RolesUsersProvider,
  endpointDataStreamHelpers: SecuritySolutionEndpointDataStreamHelpers,
  endpointRegistryHelpers: SecuritySolutionEndpointRegistryHelpers,
  securitySolutionUtils: SecuritySolutionESSUtils,
};
