/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import {
  createFleetRequestHandlerContextMock,
  createMockAgentService,
  createMockAgentPolicyService,
  createPackagePolicyServiceMock,
  createMockPackageService,
} from '@kbn/fleet-plugin/server/mocks';
import { mockAuthenticatedUser } from '@kbn/security-plugin/common/model/authenticated_user.mock';

export const createCspRequestHandlerContextMock = () => {
  const coreMockRequestContext = coreMock.createRequestHandlerContext();

  return {
    core: coreMockRequestContext,
    fleet: createFleetRequestHandlerContextMock(),
    csp: {
      user: mockAuthenticatedUser(),
      logger: loggingSystemMock.createLogger(),
      esClient: coreMockRequestContext.elasticsearch.client,
      soClient: coreMockRequestContext.savedObjects.client,
      agentPolicyService: createMockAgentPolicyService(),
      agentService: createMockAgentService(),
      packagePolicyService: createPackagePolicyServiceMock(),
      packageService: createMockPackageService(),
      isPluginInitialized: () => false,
    },
  };
};
