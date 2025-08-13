/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { services as xPackAPIServices } from '@kbn/test-suites-xpack-platform/api_integration/services';
import { EndpointTestResourcesProvider } from '../../../security_solution_endpoint/services/endpoint';
import { EndpointArtifactsTestResourcesProvider } from '../../../security_solution_endpoint/services/endpoint_artifacts';
import { EndpointPolicyTestResourcesProvider } from '../../../security_solution_endpoint/services/endpoint_policy';

import { ResolverGeneratorProvider } from '../services/security_solution_edr_workflows_resolver';
import { RolesUsersProvider } from '../services/security_solution_edr_workflows_roles_users';
import {
  SecuritySolutionEndpointDataStreamHelpers,
  SecuritySolutionEndpointRegistryHelpers,
} from '../services/common';
import { SecuritySolutionESSUtils } from '../services/security_solution_ess_utils';

export const services = {
  ...xPackAPIServices,
  resolverGenerator: ResolverGeneratorProvider,
  endpointTestResources: EndpointTestResourcesProvider,
  endpointPolicyTestResources: EndpointPolicyTestResourcesProvider,
  endpointArtifactTestResources: EndpointArtifactsTestResourcesProvider,
  rolesUsersProvider: RolesUsersProvider,
  endpointDataStreamHelpers: SecuritySolutionEndpointDataStreamHelpers,
  endpointRegistryHelpers: SecuritySolutionEndpointRegistryHelpers,
  securitySolutionUtils: SecuritySolutionESSUtils,
  samlAuth: commonFunctionalServices.samlAuth,
};
