/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { policiesQueryParamsSchema } from '../../../common';
import { DEFAULT_POLICIES_PER_PAGE } from '../../../common/constants';
import {
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  getCloudDefendPackagePolicies,
  getCloudDefendAgentPolicies,
} from '../../lib/fleet_util';
import { defineGetPoliciesRoute } from './policies';

import { SavedObjectsClientContract } from '@kbn/core/server';
import {
  createMockAgentPolicyService,
  createPackagePolicyServiceMock,
} from '@kbn/fleet-plugin/server/mocks';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { createCloudDefendRequestHandlerContextMock } from '../../mocks';

describe('policies API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validate the API route path', async () => {
    const router = mockRouter.create();

    defineGetPoliciesRoute(router);

    const [config] = (router.versioned.get as jest.Mock).mock.calls[0];

    expect(config.path).toEqual('/internal/cloud_defend/policies');
  });

  it('should accept to a user with fleet.all privilege', async () => {
    const router = mockRouter.create();

    const route = defineGetPoliciesRoute(router);

    const [_, handler] = (route.addVersion as jest.Mock).mock.calls[0];

    const mockContext = createCloudDefendRequestHandlerContextMock();
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(0);
  });

  it('should reject to a user without fleet.all privilege', async () => {
    const router = mockRouter.create();

    const route = defineGetPoliciesRoute(router);

    const [_, handler] = (route.addVersion as jest.Mock).mock.calls[0];

    const mockContext = createCloudDefendRequestHandlerContextMock();
    mockContext.fleet.authz.fleet.all = false;

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(1);
  });

  describe('test input schema', () => {
    it('expect to find default values', async () => {
      const validatedQuery = policiesQueryParamsSchema.validate({});

      expect(validatedQuery).toMatchObject({
        page: 1,
        per_page: DEFAULT_POLICIES_PER_PAGE,
      });
    });

    it('expect to find policy_name', async () => {
      const validatedQuery = policiesQueryParamsSchema.validate({
        policy_name: 'my_cis_policy',
      });

      expect(validatedQuery).toMatchObject({
        page: 1,
        per_page: DEFAULT_POLICIES_PER_PAGE,
        policy_name: 'my_cis_policy',
      });
    });

    it('should throw when page field is not a positive integer', async () => {
      expect(() => {
        policiesQueryParamsSchema.validate({ page: -2 });
      }).toThrow();
    });

    it('should throw when per_page field is not a positive integer', async () => {
      expect(() => {
        policiesQueryParamsSchema.validate({ per_page: -2 });
      }).toThrow();
    });
  });

  it('should throw when sort_field is not string', async () => {
    expect(() => {
      policiesQueryParamsSchema.validate({ sort_field: true });
    }).toThrow();
  });

  it('should not throw when sort_field is a string', async () => {
    expect(() => {
      policiesQueryParamsSchema.validate({ sort_field: 'package_policy.name' });
    }).not.toThrow();
  });

  it('should throw when sort_order is not `asc` or `desc`', async () => {
    expect(() => {
      policiesQueryParamsSchema.validate({ sort_order: 'Other Direction' });
    }).toThrow();
  });

  it('should not throw when `asc` is input for sort_order field', async () => {
    expect(() => {
      policiesQueryParamsSchema.validate({ sort_order: 'asc' });
    }).not.toThrow();
  });

  it('should not throw when `desc` is input for sort_order field', async () => {
    expect(() => {
      policiesQueryParamsSchema.validate({ sort_order: 'desc' });
    }).not.toThrow();
  });

  it('should not throw when fields is a known string literal', async () => {
    expect(() => {
      policiesQueryParamsSchema.validate({ sort_field: 'package_policy.name' });
    }).not.toThrow();
  });

  describe('test policies utils', () => {
    let mockSoClient: jest.Mocked<SavedObjectsClientContract>;

    beforeEach(() => {
      mockSoClient = savedObjectsClientMock.create();
    });

    describe('test getPackagePolicies', () => {
      it('should format request by package name', async () => {
        const mockPackagePolicyService = createPackagePolicyServiceMock();

        await getCloudDefendPackagePolicies(mockSoClient, mockPackagePolicyService, 'myPackage', {
          page: 1,
          per_page: 100,
          sort_order: 'desc',
        });

        expect(mockPackagePolicyService.list.mock.calls[0][1]).toMatchObject(
          expect.objectContaining({
            kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:myPackage`,
            page: 1,
            perPage: 100,
          })
        );
      });

      it('should build sort request by `sort_field` and default `sort_order`', async () => {
        const mockAgentPolicyService = createPackagePolicyServiceMock();

        await getCloudDefendPackagePolicies(mockSoClient, mockAgentPolicyService, 'myPackage', {
          page: 1,
          per_page: 100,
          sort_field: 'package_policy.name',
          sort_order: 'desc',
        });

        expect(mockAgentPolicyService.list.mock.calls[0][1]).toMatchObject(
          expect.objectContaining({
            kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:myPackage`,
            page: 1,
            perPage: 100,
            sortField: 'name',
            sortOrder: 'desc',
          })
        );
      });

      it('should build sort request by `sort_field` and asc `sort_order`', async () => {
        const mockAgentPolicyService = createPackagePolicyServiceMock();

        await getCloudDefendPackagePolicies(mockSoClient, mockAgentPolicyService, 'myPackage', {
          page: 1,
          per_page: 100,
          sort_field: 'package_policy.name',
          sort_order: 'asc',
        });

        expect(mockAgentPolicyService.list.mock.calls[0][1]).toMatchObject(
          expect.objectContaining({
            kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:myPackage`,
            page: 1,
            perPage: 100,
            sortField: 'name',
            sortOrder: 'asc',
          })
        );
      });
    });

    it('should format request by policy_name', async () => {
      const mockAgentPolicyService = createPackagePolicyServiceMock();

      await getCloudDefendPackagePolicies(mockSoClient, mockAgentPolicyService, 'myPackage', {
        page: 1,
        per_page: 100,
        sort_order: 'desc',
        policy_name: 'cloud_defend_1',
      });

      expect(mockAgentPolicyService.list.mock.calls[0][1]).toMatchObject(
        expect.objectContaining({
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:myPackage AND ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.name: *cloud_defend_1*`,
          page: 1,
          perPage: 100,
        })
      );
    });

    describe('test getAgentPolicies', () => {
      it('should return one agent policy id when there is duplication', async () => {
        const agentPolicyService = createMockAgentPolicyService();
        const packagePolicies = [createPackagePolicyMock(), createPackagePolicyMock()];

        await getCloudDefendAgentPolicies(mockSoClient, packagePolicies, agentPolicyService);

        expect(agentPolicyService.getByIds.mock.calls[0][1]).toHaveLength(1);
      });

      it('should return full policy ids list when there is no id duplication', async () => {
        const agentPolicyService = createMockAgentPolicyService();

        const packagePolicy1 = createPackagePolicyMock();
        const packagePolicy2 = createPackagePolicyMock();
        packagePolicy2.policy_ids = ['AnotherId'];
        const packagePolicies = [packagePolicy1, packagePolicy2];

        await getCloudDefendAgentPolicies(mockSoClient, packagePolicies, agentPolicyService);

        expect(agentPolicyService.getByIds.mock.calls[0][1]).toHaveLength(2);
      });
    });
  });
});
