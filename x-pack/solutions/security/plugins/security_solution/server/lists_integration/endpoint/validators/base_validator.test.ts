/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import {
  createMockEndpointAppContextService,
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
} from '../../../endpoint/mocks';
import { BaseValidatorMock, createExceptionItemLikeOptionsMock } from './mocks';
import { EndpointArtifactExceptionValidationError } from './errors';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { createFleetAuthzMock } from '@kbn/fleet-plugin/common/mocks';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import type { ExceptionItemLikeOptions } from '../types';
import {
  BY_POLICY_ARTIFACT_TAG_PREFIX,
  GLOBAL_ARTIFACT_TAG,
} from '../../../../common/endpoint/service/artifacts';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { setArtifactOwnerSpaceId } from '../../../../common/endpoint/service/artifacts/utils';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import type { EndpointAuthz } from '../../../../common/endpoint/types/authz';

describe('When using Artifacts Exceptions BaseValidator', () => {
  let endpointAppContextServices: EndpointAppContextService;
  let kibanaRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let exceptionLikeItem: ExceptionItemLikeOptions;
  let validator: BaseValidatorMock;
  let packagePolicyService: jest.Mocked<PackagePolicyClient>;
  let initValidator: (withNoAuth?: boolean, withBasicLicense?: boolean) => BaseValidatorMock;

  beforeEach(() => {
    kibanaRequest = httpServerMock.createKibanaRequest();
    exceptionLikeItem = createExceptionItemLikeOptionsMock();

    const servicesStart = createMockEndpointAppContextServiceStartContract();

    packagePolicyService = servicesStart.fleetStartServices
      .packagePolicyService as jest.Mocked<PackagePolicyClient>;

    endpointAppContextServices = new EndpointAppContextService();
    endpointAppContextServices.setup(createMockEndpointAppContextServiceSetupContract());
    endpointAppContextServices.start(servicesStart);

    initValidator = (withNoAuth: boolean = false, withBasicLicense = false) => {
      if (withNoAuth) {
        const fleetAuthz = createFleetAuthzMock();
        fleetAuthz.fleet.all = false;
        (servicesStart.fleetStartServices.authz.fromRequest as jest.Mock).mockResolvedValue(
          fleetAuthz
        );
        (servicesStart.security.authc.getCurrentUser as jest.Mock).mockReturnValue(
          securityMock.createMockAuthenticatedUser()
        );
      }

      if (withBasicLicense) {
        (servicesStart.licenseService.isPlatinumPlus as jest.Mock).mockResolvedValue(false);
      }

      validator = new BaseValidatorMock(endpointAppContextServices, kibanaRequest);

      return validator;
    };
  });

  afterEach(() => {
    // @ts-expect-error setting variable to undefined
    validator = undefined;
  });

  it('should use default endpoint authz (no access) when `request` is not provided', async () => {
    const baseValidator = new BaseValidatorMock(endpointAppContextServices);

    await expect(baseValidator._isAllowedToCreateArtifactsByPolicy()).resolves.toBe(false);
    await expect(baseValidator._validateCanManageEndpointArtifacts()).rejects.toBeInstanceOf(
      EndpointArtifactExceptionValidationError
    );
  });

  it('should validate is allowed to manage endpoint artifacts', async () => {
    await expect(initValidator()._validateCanManageEndpointArtifacts()).resolves.toBeUndefined();
  });

  it('should throw if not allowed to manage endpoint artifacts', async () => {
    await expect(initValidator(true)._validateCanManageEndpointArtifacts()).rejects.toBeInstanceOf(
      EndpointArtifactExceptionValidationError
    );
  });

  it('should validate basic artifact data', async () => {
    await expect(initValidator()._validateBasicData(exceptionLikeItem)).resolves.toBeUndefined();
  });

  it.each([
    [
      'name is empty',
      () => {
        exceptionLikeItem.name = '';
      },
    ],
    [
      'namespace is not agnostic',
      () => {
        exceptionLikeItem.namespaceType = 'single';
      },
    ],
    [
      'osTypes has more than 1 value',
      () => {
        exceptionLikeItem.osTypes = ['macos', 'linux'];
      },
    ],
    [
      'osType has invalid value',
      () => {
        exceptionLikeItem.osTypes = ['xunil' as 'linux'];
      },
    ],
  ])('should throw if %s', async (_, setupData) => {
    setupData();

    await expect(initValidator()._validateBasicData(exceptionLikeItem)).rejects.toBeInstanceOf(
      EndpointArtifactExceptionValidationError
    );
  });

  it('should validate is allowed to create artifacts by policy', async () => {
    await expect(
      initValidator()._validateCanCreateByPolicyArtifacts(exceptionLikeItem)
    ).resolves.toBeUndefined();
  });

  it('should throw if not allowed to create artifacts by policy', async () => {
    await expect(
      initValidator(false, true)._validateCanCreateByPolicyArtifacts(exceptionLikeItem)
    ).rejects.toBeInstanceOf(EndpointArtifactExceptionValidationError);
  });

  it('should validate policy ids for by policy artifacts', async () => {
    packagePolicyService.getByIDs.mockResolvedValue([
      {
        id: '123',
        version: '123',
      } as PackagePolicy,
    ]);

    await expect(initValidator()._validateByPolicyItem(exceptionLikeItem)).resolves.toBeUndefined();
  });

  it('should throw if policy ids for by policy artifacts are not valid', async () => {
    packagePolicyService.getByIDs.mockResolvedValue([]);

    await expect(initValidator()._validateByPolicyItem(exceptionLikeItem)).rejects.toBeInstanceOf(
      EndpointArtifactExceptionValidationError
    );
  });

  it.each([
    ['no policies (unassigned)', () => createExceptionItemLikeOptionsMock({ tags: [] })],
    [
      'different policy',
      () => createExceptionItemLikeOptionsMock({ tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}:456`] }),
    ],
    [
      'additional policies',
      () =>
        createExceptionItemLikeOptionsMock({
          tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}:123`, `${BY_POLICY_ARTIFACT_TAG_PREFIX}:456`],
        }),
    ],
  ])(
    'should return `true` when `wasByPolicyEffectScopeChanged()` is called with: %s',
    (_, getUpdated) => {
      expect(initValidator()._wasByPolicyEffectScopeChanged(getUpdated(), exceptionLikeItem)).toBe(
        true
      );
    }
  );

  it.each([
    ['identical data', () => createExceptionItemLikeOptionsMock()],
    [
      'scope changed to all',
      () => createExceptionItemLikeOptionsMock({ tags: [GLOBAL_ARTIFACT_TAG] }),
    ],
  ])('should return `false` when `wasByPolicyEffectScopeChanged()` with: %s', (_, getUpdated) => {
    expect(initValidator()._wasByPolicyEffectScopeChanged(getUpdated(), exceptionLikeItem)).toBe(
      false
    );
  });

  describe('with space awareness', () => {
    const noGlobalArtifactManagementAuthzMessage =
      'EndpointArtifactError: Endpoint authorization failure. Management of "ownerSpaceId" tag requires global artifact management privilege';
    let authzMock: EndpointAuthz;

    beforeEach(() => {
      authzMock = getEndpointAuthzInitialStateMock();
      endpointAppContextServices = createMockEndpointAppContextService();
      // @ts-expect-error updating a readonly field
      endpointAppContextServices.experimentalFeatures.endpointManagementSpaceAwarenessEnabled =
        true;
      (endpointAppContextServices.getEndpointAuthz as jest.Mock).mockResolvedValue(authzMock);
      setArtifactOwnerSpaceId(exceptionLikeItem, DEFAULT_SPACE_ID);
      validator = new BaseValidatorMock(endpointAppContextServices, kibanaRequest);
    });

    describe('#validateCreateOnwerSpaceIds()', () => {
      it('should error if adding an spaceOwnerId but has no global artifact management authz', async () => {
        setArtifactOwnerSpaceId(exceptionLikeItem, 'foo');
        authzMock.canManageGlobalArtifacts = false;

        await expect(validator._validateCreateOwnerSpaceIds(exceptionLikeItem)).rejects.toThrow(
          noGlobalArtifactManagementAuthzMessage
        );
      });

      it('should allow spaceOwnerId tag matching current space even if no global artifact management authz', async () => {
        authzMock.canManageGlobalArtifacts = false;

        await expect(
          validator._validateCreateOwnerSpaceIds(exceptionLikeItem)
        ).resolves.toBeUndefined();
      });

      it('should allow additional spaceOwnerId tags if user has global artifact management authz', async () => {
        setArtifactOwnerSpaceId(exceptionLikeItem, 'foo');

        await expect(
          validator._validateCreateOwnerSpaceIds(exceptionLikeItem)
        ).resolves.toBeUndefined();
      });

      it('should not error if feature flag is disabled', async () => {
        // @ts-expect-error updating a readonly field
        endpointAppContextServices.experimentalFeatures.endpointManagementSpaceAwarenessEnabled =
          false;
        authzMock.canManageGlobalArtifacts = false;
        setArtifactOwnerSpaceId(exceptionLikeItem, 'foo');
        setArtifactOwnerSpaceId(exceptionLikeItem, 'bar');

        await expect(
          validator._validateCreateOwnerSpaceIds(exceptionLikeItem)
        ).resolves.toBeUndefined();
      });
    });

    describe('#validateUpdateOnwerSpaceIds()', () => {
      let savedExceptionLikeItem: ExceptionItemLikeOptions;

      beforeEach(() => {
        savedExceptionLikeItem = createExceptionItemLikeOptionsMock();
        setArtifactOwnerSpaceId(exceptionLikeItem, DEFAULT_SPACE_ID);
      });

      it('should error if changing spaceOwnerId but has no global artifact management authz', async () => {
        authzMock.canManageGlobalArtifacts = false;
        setArtifactOwnerSpaceId(exceptionLikeItem, 'foo');

        await expect(
          validator._validateUpdateOwnerSpaceIds(exceptionLikeItem, savedExceptionLikeItem)
        ).rejects.toThrow(noGlobalArtifactManagementAuthzMessage);
      });

      it('should allow changes to spaceOwnerId tags if user has global artifact management authz', async () => {
        setArtifactOwnerSpaceId(exceptionLikeItem, 'foo');

        await expect(
          validator._validateUpdateOwnerSpaceIds(exceptionLikeItem, savedExceptionLikeItem)
        ).resolves.toBeUndefined();
      });

      it('should not error if feature flag is disabled', async () => {
        // @ts-expect-error updating a readonly field
        endpointAppContextServices.experimentalFeatures.endpointManagementSpaceAwarenessEnabled =
          false;
        authzMock.canManageGlobalArtifacts = false;
        setArtifactOwnerSpaceId(exceptionLikeItem, 'foo');
        setArtifactOwnerSpaceId(exceptionLikeItem, 'bar');

        await expect(
          validator._validateUpdateOwnerSpaceIds(exceptionLikeItem, savedExceptionLikeItem)
        ).resolves.toBeUndefined();
      });
    });
  });
});
