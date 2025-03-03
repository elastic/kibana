/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { isEqual } from 'lodash/fp';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { OperatingSystem } from '@kbn/securitysolution-utils';

import { i18n } from '@kbn/i18n';
import { ENDPOINT_AUTHZ_ERROR_MESSAGE } from '../../../endpoint/errors';
import {
  getArtifactOwnerSpaceIds,
  setArtifactOwnerSpaceId,
} from '../../../../common/endpoint/service/artifacts/utils';
import type { FeatureKeys } from '../../../endpoint/services';
import type { EndpointAuthz } from '../../../../common/endpoint/types/authz';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { ExceptionItemLikeOptions } from '../types';
import { getEndpointAuthzInitialState } from '../../../../common/endpoint/service/authz';
import {
  getPolicyIdsFromArtifact,
  isArtifactByPolicy,
} from '../../../../common/endpoint/service/artifacts';
import { EndpointArtifactExceptionValidationError } from './errors';
import { EndpointExceptionsValidationError } from './endpoint_exception_errors';

const OWNER_SPACE_ID_TAG_MANAGEMENT_NOT_ALLOWED_MESSAGE = i18n.translate(
  'xpack.securitySolution.baseValidator.noGlobalArtifactAuthzApiMessage',
  {
    defaultMessage:
      'Management of "ownerSpaceId" tag requires global artifact management privilege',
  }
);

export const GLOBAL_ARTIFACT_MANAGEMENT_NOT_ALLOWED_MESSAGE = i18n.translate(
  'xpack.securitySolution.baseValidator.noGlobalArtifactManagementMessage',
  {
    defaultMessage:
      'Management of global artifacts requires additional privilege (global artifact management)',
  }
);

const ITEM_CANNOT_BE_MANAGED_IN_CURRENT_SPACE_MESSAGE = (spaceIds: string[]): string =>
  i18n.translate('xpack.securitySolution.baseValidator.cannotManageItemInCurrentSpace', {
    defaultMessage: `Updates to this shared item can only be done from the following space {numberOfSpaces, plural, one {ID} other {IDs} }: {itemOwnerSpaces} (or by someone having global artifact management privilege)`,
    values: {
      numberOfSpaces: spaceIds.length,
      itemOwnerSpaces: spaceIds.join(', '),
    },
  });

export const BasicEndpointExceptionDataSchema = schema.object(
  {
    // must have a name
    name: schema.string({ minLength: 1, maxLength: 256 }),

    description: schema.maybe(schema.string({ minLength: 0, maxLength: 256, defaultValue: '' })),

    // We only support agnostic entries
    namespaceType: schema.literal('agnostic'),

    // only one OS per entry
    osTypes: schema.arrayOf(
      schema.oneOf([
        schema.literal(OperatingSystem.WINDOWS),
        schema.literal(OperatingSystem.LINUX),
        schema.literal(OperatingSystem.MAC),
      ]),
      { minSize: 1, maxSize: 1 }
    ),
  },
  // Because we are only validating some fields from the Exception Item, we set `unknowns` to `ignore` here
  { unknowns: 'ignore' }
);

/**
 * Provides base methods for doing validation that apply across endpoint exception entries
 */
export class BaseValidator {
  private readonly endpointAuthzPromise: ReturnType<EndpointAppContextService['getEndpointAuthz']>;
  protected readonly logger: Logger;

  constructor(
    protected readonly endpointAppContext: EndpointAppContextService,
    /**
     * Request is optional only because it needs to be optional in the Lists ExceptionListClient
     */
    private readonly request?: KibanaRequest
  ) {
    this.logger = endpointAppContext.createLogger(this.constructor.name ?? 'artifactBaseValidator');

    if (this.request) {
      this.endpointAuthzPromise = this.endpointAppContext.getEndpointAuthz(this.request);
    } else {
      this.endpointAuthzPromise = Promise.resolve(getEndpointAuthzInitialState());
    }
  }

  public notifyFeatureUsage(item: ExceptionItemLikeOptions, featureKey: FeatureKeys): void {
    if (
      (this.isItemByPolicy(item) && featureKey.endsWith('_BY_POLICY')) ||
      (!this.isItemByPolicy(item) && !featureKey.endsWith('_BY_POLICY'))
    ) {
      this.endpointAppContext.getFeatureUsageService().notifyUsage(featureKey);
    }
  }

  protected async validateHasEndpointExceptionsPrivileges(
    privilege: keyof EndpointAuthz
  ): Promise<void> {
    if (!(await this.endpointAuthzPromise)[privilege]) {
      throw new EndpointExceptionsValidationError('Endpoint exceptions authorization failure', 403);
    }
  }

  protected async validateHasPrivilege(privilege: keyof EndpointAuthz): Promise<void> {
    if (!(await this.endpointAuthzPromise)[privilege]) {
      throw new EndpointArtifactExceptionValidationError(ENDPOINT_AUTHZ_ERROR_MESSAGE, 403);
    }
  }

  protected isItemByPolicy(item: Partial<Pick<ExceptionListItemSchema, 'tags'>>): boolean {
    return isArtifactByPolicy(item as Pick<ExceptionListItemSchema, 'tags'>);
  }

  protected async isAllowedToCreateArtifactsByPolicy(): Promise<boolean> {
    return (await this.endpointAuthzPromise).canCreateArtifactsByPolicy;
  }

  protected async validateCanManageEndpointArtifacts(): Promise<void> {
    if (!(await this.endpointAuthzPromise).canAccessEndpointManagement) {
      throw new EndpointArtifactExceptionValidationError(ENDPOINT_AUTHZ_ERROR_MESSAGE, 403);
    }
  }

  protected async validateCanIsolateHosts(): Promise<void> {
    if (!(await this.endpointAuthzPromise).canIsolateHost) {
      throw new EndpointArtifactExceptionValidationError(ENDPOINT_AUTHZ_ERROR_MESSAGE, 403);
    }
  }

  /**
   * validates some basic common data that can be found across all endpoint exceptions
   * @param item
   * @protected
   */
  protected async validateBasicData(item: ExceptionItemLikeOptions) {
    try {
      BasicEndpointExceptionDataSchema.validate(item);
    } catch (error) {
      throw new EndpointArtifactExceptionValidationError(error.message);
    }
  }

  protected async validateCanCreateByPolicyArtifacts(
    item: ExceptionItemLikeOptions
  ): Promise<void> {
    if (this.isItemByPolicy(item) && !(await this.isAllowedToCreateArtifactsByPolicy())) {
      throw new EndpointArtifactExceptionValidationError(
        'Your license level does not allow create/update of by policy artifacts',
        403
      );
    }
  }

  /**
   * Validates that by-policy artifacts is permitted and that each policy referenced in the item is valid
   * @protected
   */
  protected async validateByPolicyItem(item: ExceptionItemLikeOptions): Promise<void> {
    if (this.isItemByPolicy(item)) {
      const { packagePolicy, savedObjects } = this.endpointAppContext.getInternalFleetServices();
      const policyIds = getPolicyIdsFromArtifact(item);
      const soClient = savedObjects.createInternalScopedSoClient();

      if (policyIds.length === 0) {
        return;
      }

      const policiesFromFleet = await packagePolicy.getByIDs(soClient, policyIds, {
        ignoreMissing: true,
      });

      if (!policiesFromFleet) {
        throw new EndpointArtifactExceptionValidationError(
          `invalid policy ids: ${policyIds.join(', ')}`
        );
      }

      const invalidPolicyIds = policyIds.filter(
        (policyId) => !policiesFromFleet.some((policy) => policyId === policy.id)
      );

      if (invalidPolicyIds.length) {
        throw new EndpointArtifactExceptionValidationError(
          `invalid policy ids: ${invalidPolicyIds.join(', ')}`
        );
      }
    }
  }

  /**
   * If the item being updated is `by policy`, method validates if anyting was changes in regard to
   * the effected scope of the by policy settings.
   *
   * @param updatedItem
   * @param currentItem
   * @protected
   */
  protected wasByPolicyEffectScopeChanged(
    updatedItem: ExceptionItemLikeOptions,
    currentItem: Pick<ExceptionListItemSchema, 'tags'>
  ): boolean {
    // if global, then return. Nothing to validate and setting the trusted app to global is allowed
    if (!this.isItemByPolicy(updatedItem)) {
      return false;
    }

    if (updatedItem.tags) {
      return !isEqual(
        getPolicyIdsFromArtifact({ tags: updatedItem.tags }),
        getPolicyIdsFromArtifact(currentItem)
      );
    }

    return false;
  }

  protected async validateUpdateOwnerSpaceIds(
    updatedItem: Partial<Pick<ExceptionListItemSchema, 'tags'>>,
    currentItem: Pick<ExceptionListItemSchema, 'tags'>
  ): Promise<void> {
    if (
      this.endpointAppContext.experimentalFeatures.endpointManagementSpaceAwarenessEnabled &&
      this.wasOwnerSpaceIdTagsChanged(updatedItem, currentItem) &&
      !(await this.endpointAuthzPromise).canManageGlobalArtifacts
    ) {
      throw new EndpointArtifactExceptionValidationError(
        `${ENDPOINT_AUTHZ_ERROR_MESSAGE}. ${OWNER_SPACE_ID_TAG_MANAGEMENT_NOT_ALLOWED_MESSAGE}`,
        403
      );
    }
  }

  protected async validateCreateOwnerSpaceIds(item: ExceptionItemLikeOptions): Promise<void> {
    if (
      this.endpointAppContext.experimentalFeatures.endpointManagementSpaceAwarenessEnabled &&
      item.tags &&
      item.tags.length > 0
    ) {
      if ((await this.endpointAuthzPromise).canManageGlobalArtifacts) {
        return;
      }

      const ownerSpaceIds = getArtifactOwnerSpaceIds(item);
      const activeSpaceId = await this.getActiveSpaceId();

      if (
        ownerSpaceIds.length > 1 ||
        (ownerSpaceIds.length === 1 && ownerSpaceIds[0] !== activeSpaceId)
      ) {
        throw new EndpointArtifactExceptionValidationError(
          `${ENDPOINT_AUTHZ_ERROR_MESSAGE}. ${OWNER_SPACE_ID_TAG_MANAGEMENT_NOT_ALLOWED_MESSAGE}`,
          403
        );
      }
    }
  }

  protected wasOwnerSpaceIdTagsChanged(
    updatedItem: Partial<Pick<ExceptionListItemSchema, 'tags'>>,
    currentItem: Pick<ExceptionListItemSchema, 'tags'>
  ): boolean {
    return !isEqual(getArtifactOwnerSpaceIds(updatedItem), getArtifactOwnerSpaceIds(currentItem));
  }

  protected async getActiveSpaceId(): Promise<string> {
    if (!this.request) {
      throw new EndpointArtifactExceptionValidationError(
        'Unable to determine space id. Missing HTTP Request object',
        500
      );
    }

    return (await this.endpointAppContext.getActiveSpace(this.request)).id;
  }

  /**
   * Update the artifact item (if necessary) with a `ownerSpaceId` tag using the HTTP request's active space
   * @param item
   * @protected
   */
  protected async setOwnerSpaceId(
    item: Partial<Pick<ExceptionListItemSchema, 'tags'>>
  ): Promise<void> {
    if (this.endpointAppContext.experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
      setArtifactOwnerSpaceId(item, await this.getActiveSpaceId());
    }
  }

  protected async validateCanCreateGlobalArtifacts(item: ExceptionItemLikeOptions): Promise<void> {
    if (this.endpointAppContext.experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
      if (
        !this.isItemByPolicy(item) &&
        !(await this.endpointAuthzPromise).canManageGlobalArtifacts
      ) {
        throw new EndpointArtifactExceptionValidationError(
          `${ENDPOINT_AUTHZ_ERROR_MESSAGE}. ${GLOBAL_ARTIFACT_MANAGEMENT_NOT_ALLOWED_MESSAGE}`,
          403
        );
      }
    }
  }

  protected async validateCanUpdateItemInActiveSpace(
    updatedItem: Partial<Pick<ExceptionListItemSchema, 'tags'>>,
    currentSavedItem: ExceptionListItemSchema
  ): Promise<void> {
    if (this.endpointAppContext.experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
      // Those with global artifact management privilege can do it all
      if ((await this.endpointAuthzPromise).canManageGlobalArtifacts) {
        return;
      }

      // If either the updated item or the saved item is a global artifact, then
      // error out - user needs global artifact management privilege
      if (!this.isItemByPolicy(updatedItem) || !this.isItemByPolicy(currentSavedItem)) {
        throw new EndpointArtifactExceptionValidationError(
          `${ENDPOINT_AUTHZ_ERROR_MESSAGE}. ${GLOBAL_ARTIFACT_MANAGEMENT_NOT_ALLOWED_MESSAGE}`,
          403
        );
      }

      const itemOwnerSpaces = getArtifactOwnerSpaceIds(currentSavedItem);

      // Per-space items can only be managed from one of the `ownerSpaceId`'s
      if (!itemOwnerSpaces.includes(await this.getActiveSpaceId())) {
        throw new EndpointArtifactExceptionValidationError(
          ITEM_CANNOT_BE_MANAGED_IN_CURRENT_SPACE_MESSAGE(itemOwnerSpaces),
          403
        );
      }
    }
  }

  protected async validateCanDeleteItemInActiveSpace(
    currentSavedItem: ExceptionListItemSchema
  ): Promise<void> {
    if (this.endpointAppContext.experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
      // Those with global artifact management privilege can do it all
      if ((await this.endpointAuthzPromise).canManageGlobalArtifacts) {
        return;
      }

      // If item is a global artifact then error - user must have global artifact management privilege
      if (!this.isItemByPolicy(currentSavedItem)) {
        throw new EndpointArtifactExceptionValidationError(
          `${ENDPOINT_AUTHZ_ERROR_MESSAGE}. ${GLOBAL_ARTIFACT_MANAGEMENT_NOT_ALLOWED_MESSAGE}`,
          403
        );
      }

      const itemOwnerSpaces = getArtifactOwnerSpaceIds(currentSavedItem);

      // Per-space items can only be deleted from one of the `ownerSpaceId`'s
      if (!itemOwnerSpaces.includes(await this.getActiveSpaceId())) {
        throw new EndpointArtifactExceptionValidationError(
          ITEM_CANNOT_BE_MANAGED_IN_CURRENT_SPACE_MESSAGE(itemOwnerSpaces),
          403
        );
      }
    }
  }
}
