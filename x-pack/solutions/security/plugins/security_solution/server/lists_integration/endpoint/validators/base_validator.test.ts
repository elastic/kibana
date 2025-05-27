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
import {
  BaseValidatorMock,
  createExceptionItemLikeOptionsMock,
  createExceptionListItemMock,
} from './mocks';
import { EndpointArtifactExceptionValidationError } from './errors';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { createFleetAuthzMock, createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import type { ExceptionItemLikeOptions } from '../types';
import {
  BY_POLICY_ARTIFACT_TAG_PREFIX,
  GLOBAL_ARTIFACT_TAG,
} from '../../../../common/endpoint/service/artifacts';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import {
  buildPerPolicyTag,
  buildSpaceOwnerIdTag,
  setArtifactOwnerSpaceId,
} from '../../../../common/endpoint/service/artifacts/utils';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import type { EndpointAuthz } from '../../../../common/endpoint/types/authz';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

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
    const noAuthzToManageOwnerSpaceIdError =
      'EndpointArtifactError: Endpoint authorization failure. Management of "ownerSpaceId" tag requires global artifact management privilege';
    const noAuthzToManageGlobalArtifactsError =
      'EndpointArtifactError: Endpoint authorization failure. Management of global artifacts requires additional privilege (global artifact management)';
    const itemCanNotBeManagedInActiveSpaceErrorMessage =
      'EndpointArtifactError: Updates to this shared item can only be done from the following space ID: foo (or by someone having global artifact management privilege)';
    const setSpaceAwarenessFeatureFlag = (value: 'enabled' | 'disabled'): void => {
      // @ts-expect-error updating a readonly field
      endpointAppContextServices.experimentalFeatures.endpointManagementSpaceAwarenessEnabled =
        value === 'enabled';
    };
    let authzMock: EndpointAuthz;

    beforeEach(() => {
      authzMock = getEndpointAuthzInitialStateMock();
      endpointAppContextServices = createMockEndpointAppContextService();
      setSpaceAwarenessFeatureFlag('enabled');
      (endpointAppContextServices.getEndpointAuthz as jest.Mock).mockResolvedValue(authzMock);
      setArtifactOwnerSpaceId(exceptionLikeItem, DEFAULT_SPACE_ID);
      validator = new BaseValidatorMock(endpointAppContextServices, kibanaRequest);
      packagePolicyService = endpointAppContextServices.getInternalFleetServices()
        .packagePolicy as jest.Mocked<PackagePolicyClient>;
      packagePolicyService.listIds.mockResolvedValue({
        items: ['policy-1', 'policy-2'],
        total: 2,
        page: 1,
        perPage: 20,
      });
      packagePolicyService.getByIDs.mockResolvedValue([
        Object.assign(createPackagePolicyMock(), { id: 'policy-1' }),
        Object.assign(createPackagePolicyMock(), { id: 'policy-2' }),
      ]);
    });

    describe('#validateByPolicyItem()', () => {
      let currentItem: ExceptionListItemSchema;

      beforeEach(() => {
        currentItem = createExceptionListItemMock({
          tags: exceptionLikeItem.tags,
        });
      });

      it('should not error if policy is not returned by fleet for active space, but it is already associated with item', async () => {
        packagePolicyService.getByIDs.mockResolvedValue([]);

        await expect(
          initValidator()._validateByPolicyItem(exceptionLikeItem, currentItem)
        ).resolves.toBeUndefined();
      });
    });

    describe('#validateCreateOnwerSpaceIds()', () => {
      it('should error if adding an spaceOwnerId but has no global artifact management authz', async () => {
        setArtifactOwnerSpaceId(exceptionLikeItem, 'foo');
        authzMock.canManageGlobalArtifacts = false;

        await expect(validator._validateCreateOwnerSpaceIds(exceptionLikeItem)).rejects.toThrow(
          noAuthzToManageOwnerSpaceIdError
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
        setSpaceAwarenessFeatureFlag('disabled');
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
        ).rejects.toThrow(noAuthzToManageOwnerSpaceIdError);
      });

      it('should allow changes to spaceOwnerId tags if user has global artifact management authz', async () => {
        setArtifactOwnerSpaceId(exceptionLikeItem, 'foo');

        await expect(
          validator._validateUpdateOwnerSpaceIds(exceptionLikeItem, savedExceptionLikeItem)
        ).resolves.toBeUndefined();
      });

      it('should not error if feature flag is disabled', async () => {
        setSpaceAwarenessFeatureFlag('disabled');
        authzMock.canManageGlobalArtifacts = false;
        setArtifactOwnerSpaceId(exceptionLikeItem, 'foo');
        setArtifactOwnerSpaceId(exceptionLikeItem, 'bar');

        await expect(
          validator._validateUpdateOwnerSpaceIds(exceptionLikeItem, savedExceptionLikeItem)
        ).resolves.toBeUndefined();
      });
    });

    describe('#validateCanCreateGlobalArtifacts()', () => {
      beforeEach(() => {
        exceptionLikeItem.tags = [GLOBAL_ARTIFACT_TAG];
      });

      it('should do nothing if feature flag is turned off', async () => {
        authzMock.canManageGlobalArtifacts = false;
        setSpaceAwarenessFeatureFlag('disabled');

        await expect(
          validator._validateCanCreateGlobalArtifacts(exceptionLikeItem)
        ).resolves.toBeUndefined();
      });

      it('should error is user does not have new global artifact management privilege', async () => {
        authzMock.canManageGlobalArtifacts = false;

        await expect(
          validator._validateCanCreateGlobalArtifacts(exceptionLikeItem)
        ).rejects.toThrow(noAuthzToManageGlobalArtifactsError);
      });

      it('should allow creation of global artifacts when user has privilege', async () => {
        await expect(
          validator._validateCanCreateGlobalArtifacts(exceptionLikeItem)
        ).resolves.toBeUndefined();
      });
    });

    describe('#validateCanUpdateItemInActiveSpace()', () => {
      let savedExceptionItem: ExceptionListItemSchema;

      beforeEach(() => {
        savedExceptionItem = createExceptionListItemMock({
          // Saved item is owned by different space id
          tags: [buildPerPolicyTag('123'), buildSpaceOwnerIdTag('foo')],
        });
      });

      it('should do nothing if feature flag is turned off', async () => {
        setSpaceAwarenessFeatureFlag('disabled');
        authzMock.canManageGlobalArtifacts = false;

        await expect(
          validator._validateCanUpdateItemInActiveSpace(exceptionLikeItem, savedExceptionItem)
        ).resolves.toBeUndefined();
      });

      it('should error if updating a global item when user does not have global artifact privilege', async () => {
        authzMock.canManageGlobalArtifacts = false;
        savedExceptionItem.tags = [GLOBAL_ARTIFACT_TAG, buildSpaceOwnerIdTag('foo')];

        await expect(
          validator._validateCanUpdateItemInActiveSpace(exceptionLikeItem, savedExceptionItem)
        ).rejects.toThrow(noAuthzToManageGlobalArtifactsError);
      });

      it('should error if updating an item outside of its owner space id when user does not have global artifact privilege', async () => {
        authzMock.canManageGlobalArtifacts = false;

        await expect(
          validator._validateCanUpdateItemInActiveSpace(exceptionLikeItem, savedExceptionItem)
        ).rejects.toThrow(itemCanNotBeManagedInActiveSpaceErrorMessage);
      });

      it('should allow updates to global items when user has global artifact privilege', async () => {
        savedExceptionItem.tags = [GLOBAL_ARTIFACT_TAG, buildSpaceOwnerIdTag('foo')];

        await expect(
          validator._validateCanUpdateItemInActiveSpace(exceptionLikeItem, savedExceptionItem)
        ).resolves.toBeUndefined();
      });

      it('should allow update to item outside of owner space id when user has global artifact privilege', async () => {
        await expect(
          validator._validateCanUpdateItemInActiveSpace(exceptionLikeItem, savedExceptionItem)
        ).resolves.toBeUndefined();
      });

      it('should allow update to item inside of owner space id when user has no global artifact privilege', async () => {
        authzMock.canManageGlobalArtifacts = false;
        savedExceptionItem.tags = [buildPerPolicyTag('123'), buildSpaceOwnerIdTag('default')];

        await expect(
          validator._validateCanUpdateItemInActiveSpace(exceptionLikeItem, savedExceptionItem)
        ).resolves.toBeUndefined();
      });
    });

    describe('#validateCanDeleteItemInActiveSpace()', () => {
      let savedExceptionItem: ExceptionListItemSchema;

      beforeEach(() => {
        savedExceptionItem = createExceptionListItemMock({
          // Saved item is owned by different space id
          tags: [buildPerPolicyTag('123'), buildSpaceOwnerIdTag('foo')],
        });
      });

      it('should do nothing if feature flag is turned off', async () => {
        authzMock.canManageGlobalArtifacts = false;
        setSpaceAwarenessFeatureFlag('disabled');

        await expect(
          validator._validateCanDeleteItemInActiveSpace(savedExceptionItem)
        ).resolves.toBeUndefined();
      });

      it('should error if deleting a global artifact when user does not have global artifact privilege', async () => {
        authzMock.canManageGlobalArtifacts = false;
        savedExceptionItem.tags = [GLOBAL_ARTIFACT_TAG, buildSpaceOwnerIdTag('foo')];

        await expect(
          validator._validateCanDeleteItemInActiveSpace(savedExceptionItem)
        ).rejects.toThrow(noAuthzToManageGlobalArtifactsError);
      });

      it('should error if deleting item outside of its owner space id when user does not have global artifact privilege', async () => {
        authzMock.canManageGlobalArtifacts = false;

        await expect(
          validator._validateCanDeleteItemInActiveSpace(savedExceptionItem)
        ).rejects.toThrow(itemCanNotBeManagedInActiveSpaceErrorMessage);
      });

      it('should allow delete of global item when user has global artifact privilege', async () => {
        savedExceptionItem.tags = [GLOBAL_ARTIFACT_TAG, buildSpaceOwnerIdTag('foo')];

        await expect(
          validator._validateCanDeleteItemInActiveSpace(savedExceptionItem)
        ).resolves.toBeUndefined();
      });

      it('should allow deleting item from outside of its owner space id when user has global artifact privilege', async () => {
        await expect(
          validator._validateCanDeleteItemInActiveSpace(savedExceptionItem)
        ).resolves.toBeUndefined();
      });

      it('should allow deleting of item inside from owner space id when user has no global artifact privilege', async () => {
        authzMock.canManageGlobalArtifacts = false;
        savedExceptionItem.tags = [buildPerPolicyTag('123'), buildSpaceOwnerIdTag('default')];

        await expect(
          validator._validateCanDeleteItemInActiveSpace(savedExceptionItem)
        ).resolves.toBeUndefined();
      });
    });

    describe('#validateCanReadItemInActiveSpace()', () => {
      const itemNotFoundInSpaceErrorMessage =
        'EndpointExceptionsError: Item not found in space [default]';
      let savedExceptionItem: ExceptionListItemSchema;

      beforeEach(async () => {
        authzMock.canManageGlobalArtifacts = false;
        savedExceptionItem = createExceptionListItemMock({
          // Saved item is owned by different space id
          tags: [
            buildPerPolicyTag('some-other-policy'),
            buildPerPolicyTag('policy-1'),
            buildSpaceOwnerIdTag('foo'),
          ],
        });
      });

      it('should do nothing if feature flag is disabled', async () => {
        setSpaceAwarenessFeatureFlag('disabled');
        savedExceptionItem.tags = [buildSpaceOwnerIdTag('foo')];

        await expect(
          validator._validateCanReadItemInActiveSpace(savedExceptionItem)
        ).resolves.toBeUndefined();
      });

      it('should allow read if item is global', async () => {
        savedExceptionItem.tags = [GLOBAL_ARTIFACT_TAG, buildSpaceOwnerIdTag('foo')];

        await expect(
          validator._validateCanReadItemInActiveSpace(savedExceptionItem)
        ).resolves.toBeUndefined();
      });

      it('should allow read if user has global artifact privilege', async () => {
        authzMock.canManageGlobalArtifacts = true;
        savedExceptionItem.tags = [
          buildPerPolicyTag('policy-999-not-visible-in-space'),
          buildSpaceOwnerIdTag('foo'),
        ];

        await expect(
          validator._validateCanReadItemInActiveSpace(savedExceptionItem)
        ).resolves.toBeUndefined();
      });

      it('should allow read if item is per-policy with no policies assigned and space owner matches active space', async () => {
        savedExceptionItem.tags = [buildSpaceOwnerIdTag('default')];

        await expect(
          validator._validateCanReadItemInActiveSpace(savedExceptionItem)
        ).resolves.toBeUndefined();
      });

      it('should error if item is per-policy with no policies assigned but space owner is NOT the active space', async () => {
        savedExceptionItem.tags = [buildSpaceOwnerIdTag('foo')];

        await expect(
          validator._validateCanReadItemInActiveSpace(savedExceptionItem)
        ).rejects.toThrowError(itemNotFoundInSpaceErrorMessage);
      });

      it('should allow read if per-policy item has at least one policy that is visible in active space', async () => {
        await expect(
          validator._validateCanReadItemInActiveSpace(savedExceptionItem)
        ).resolves.toBeUndefined();
      });

      it('should error if per-policy item does not have at least 1 policy id that is visible in active space', async () => {
        savedExceptionItem.tags = [
          buildPerPolicyTag('some-other-policy'),
          buildSpaceOwnerIdTag('default'),
        ];

        await expect(
          validator._validateCanReadItemInActiveSpace(savedExceptionItem)
        ).rejects.toThrowError(itemNotFoundInSpaceErrorMessage);
      });
    });
  });
});
