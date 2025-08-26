/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { schema } from '@kbn/config-schema';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '@kbn/lists-plugin/server';
import { TrustedDeviceConditionEntryField, OperatingSystem } from '@kbn/securitysolution-utils';
import { BaseValidator, BasicEndpointExceptionDataSchema } from './base_validator';
import type { ExceptionItemLikeOptions } from '../types';
import { EndpointArtifactExceptionValidationError } from './errors';

// Error constants following the established pattern
const TRUSTED_DEVICE_EMPTY_VALUE_ERROR = 'Field value cannot be empty';
const TRUSTED_DEVICE_DUPLICATE_FIELD_ERROR = 'Duplicate field entries are not allowed';
const TRUSTED_DEVICE_DUPLICATE_OS_ERROR = 'Duplicate OS entries are not allowed';

const TrustedDeviceFieldSchema = schema.oneOf([
  schema.literal(TrustedDeviceConditionEntryField.USERNAME),
  schema.literal(TrustedDeviceConditionEntryField.HOST),
  schema.literal(TrustedDeviceConditionEntryField.DEVICE_ID),
  schema.literal(TrustedDeviceConditionEntryField.MANUFACTURER),
  schema.literal(TrustedDeviceConditionEntryField.PRODUCT_ID),
]);

const TrustedDeviceEntrySchema = schema.object({
  field: TrustedDeviceFieldSchema,
  type: schema.oneOf([
    schema.literal('match'),
    schema.literal('wildcard'),
    schema.literal('match_any'),
  ]),
  operator: schema.literal('included'),
  value: schema.oneOf([
    schema.string({
      validate: (value: string) =>
        value.trim().length > 0 ? undefined : TRUSTED_DEVICE_EMPTY_VALUE_ERROR,
    }),
    schema.arrayOf(
      schema.string({
        validate: (value: string) =>
          value.trim().length > 0 ? undefined : TRUSTED_DEVICE_EMPTY_VALUE_ERROR,
      }),
      { minSize: 1 }
    ),
  ]),
});

const TrustedDeviceEntriesSchema = schema.arrayOf(TrustedDeviceEntrySchema, {
  minSize: 1,
  validate(
    entries: Array<{ field: string; type: string; operator: string; value: string | string[] }>
  ) {
    const fields = entries.map((entry) => entry.field);
    const duplicateFields = fields.filter((field, index) => fields.indexOf(field) !== index);
    return duplicateFields.length > 0
      ? `${TRUSTED_DEVICE_DUPLICATE_FIELD_ERROR}: ${duplicateFields.join(', ')}`
      : undefined;
  },
});

const TrustedDeviceBasicDataSchema = BasicEndpointExceptionDataSchema.extends({
  osTypes: schema.arrayOf(
    schema.oneOf([schema.literal(OperatingSystem.WINDOWS), schema.literal(OperatingSystem.MAC)]),
    {
      minSize: 1,
      maxSize: 2,
      validate: (osTypes: string[]) => {
        const duplicateOs = osTypes.filter((os, index) => osTypes.indexOf(os) !== index);
        if (duplicateOs.length > 0) {
          return `${TRUSTED_DEVICE_DUPLICATE_OS_ERROR}: ${duplicateOs.join(', ')}`;
        }
        return undefined;
      },
    }
  ),
});

const TrustedDeviceDataSchema = schema.object(
  {
    entries: TrustedDeviceEntriesSchema,
  },
  // Because we are only validating some fields from the Exception Item, we set `unknowns` to `ignore` here
  { unknowns: 'ignore' }
);

export class TrustedDeviceValidator extends BaseValidator {
  static isTrustedDevice(item: { listId: string }): boolean {
    return item.listId === ENDPOINT_ARTIFACT_LISTS.trustedDevices.id;
  }

  protected async validateHasWritePrivilege(): Promise<void> {
    return super.validateHasPrivilege('canWriteTrustedDevices');
  }

  protected async validateHasReadPrivilege(): Promise<void> {
    return super.validateHasPrivilege('canReadTrustedDevices');
  }

  private async validateTrustedDevicesFeatureEnabled(): Promise<void> {
    if (!this.endpointAppContext.experimentalFeatures.trustedDevices) {
      throw new EndpointArtifactExceptionValidationError('Trusted devices feature is not enabled');
    }
  }

  async validatePreCreateItem(
    item: CreateExceptionListItemOptions
  ): Promise<CreateExceptionListItemOptions> {
    await this.validateTrustedDevicesFeatureEnabled();
    await this.validateHasWritePrivilege();
    await this.validateTrustedDeviceData(item);
    await this.validateCanCreateByPolicyArtifacts(item);
    await this.validateByPolicyItem(item);
    await this.validateCanCreateGlobalArtifacts(item);
    await this.validateCreateOwnerSpaceIds(item);

    return item;
  }

  async validatePreUpdateItem(
    _updatedItem: UpdateExceptionListItemOptions,
    currentItem: ExceptionListItemSchema
  ): Promise<UpdateExceptionListItemOptions> {
    const updatedItem = _updatedItem as ExceptionItemLikeOptions;

    await this.validateTrustedDevicesFeatureEnabled();
    await this.validateHasWritePrivilege();
    await this.validateTrustedDeviceData(updatedItem);

    try {
      await this.validateCanCreateByPolicyArtifacts(updatedItem);
    } catch (noByPolicyAuthzError) {
      // Not allowed to create/update by policy data. Validate that the effective scope of the item
      // remained unchanged with this update or was set to `global` (only allowed update). If not,
      // then throw the validation error that was catch'ed
      if (this.wasByPolicyEffectScopeChanged(updatedItem, currentItem)) {
        throw noByPolicyAuthzError;
      }
    }

    await this.validateByPolicyItem(updatedItem, currentItem);
    await this.validateUpdateOwnerSpaceIds(_updatedItem, currentItem);
    await this.validateCanUpdateItemInActiveSpace(_updatedItem, currentItem);

    return _updatedItem;
  }

  async validatePreDeleteItem(currentItem: ExceptionListItemSchema): Promise<void> {
    await this.validateTrustedDevicesFeatureEnabled();
    await this.validateHasWritePrivilege();
    await this.validateCanDeleteItemInActiveSpace(currentItem);
  }

  async validatePreGetOneItem(currentItem: ExceptionListItemSchema): Promise<void> {
    await this.validateTrustedDevicesFeatureEnabled();
    await this.validateHasReadPrivilege();
    await this.validateCanReadItemInActiveSpace(currentItem);
  }

  async validatePreMultiListFind(): Promise<void> {
    await this.validateTrustedDevicesFeatureEnabled();
    await this.validateHasReadPrivilege();
  }

  async validatePreExport(): Promise<void> {
    await this.validateTrustedDevicesFeatureEnabled();
    await this.validateHasReadPrivilege();
  }

  async validatePreSingleListFind(): Promise<void> {
    await this.validateTrustedDevicesFeatureEnabled();
    await this.validateHasReadPrivilege();
  }

  async validatePreGetListSummary(): Promise<void> {
    await this.validateTrustedDevicesFeatureEnabled();
    await this.validateHasReadPrivilege();
  }

  private async validateTrustedDeviceData(item: ExceptionItemLikeOptions): Promise<void> {
    try {
      TrustedDeviceBasicDataSchema.validate(item);
    } catch (error) {
      throw new EndpointArtifactExceptionValidationError(error.message);
    }

    try {
      TrustedDeviceDataSchema.validate(item);
    } catch (error) {
      throw new EndpointArtifactExceptionValidationError(error.message);
    }
  }
}
