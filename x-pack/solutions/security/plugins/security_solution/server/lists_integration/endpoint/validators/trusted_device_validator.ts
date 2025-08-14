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
import { BaseValidator } from './base_validator';
import type { ExceptionItemLikeOptions } from '../types';
import { EndpointArtifactExceptionValidationError } from './errors';

// Error constants following the established pattern
const TRUSTED_DEVICE_EMPTY_VALUE_ERROR = 'Field value cannot be empty';
const TRUSTED_DEVICE_DUPLICATE_FIELD_ERROR = 'Duplicate field entries are not allowed';

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

/**
 * Schema to validate Trusted Device data for create and update.
 */
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

  /**
   * Override base validation to allow both Windows and Mac OS types for trusted devices
   * CRITICAL: This is the key difference from trusted apps which only allow single OS
   */
  protected async validateBasicData(item: ExceptionItemLikeOptions) {
    const TrustedDeviceBasicDataSchema = schema.object(
      {
        name: schema.string({ minLength: 1, maxLength: 256 }),
        description: schema.maybe(
          schema.string({ minLength: 0, maxLength: 256, defaultValue: '' })
        ),
        namespaceType: schema.literal('agnostic'),
        // CRITICAL: Allow 1 or 2 OS types (Windows and/or Mac) - unlike base validator
        osTypes: schema.arrayOf(
          schema.oneOf([
            schema.literal(OperatingSystem.WINDOWS),
            schema.literal(OperatingSystem.MAC),
          ]),
          {
            minSize: 1,
            maxSize: 2,
            validate: (osTypes: string[]) => {
              const validOsTypes = [OperatingSystem.WINDOWS, OperatingSystem.MAC];
              const invalidOs = osTypes.find((os) => !validOsTypes.includes(os as OperatingSystem));
              return invalidOs
                ? `Unsupported OS type: ${invalidOs}. Only Windows and Mac are supported for trusted devices.`
                : undefined;
            },
          }
        ),
      },
      { unknowns: 'ignore' }
    );

    try {
      TrustedDeviceBasicDataSchema.validate(item);
    } catch (error) {
      throw new EndpointArtifactExceptionValidationError(error.message);
    }
  }

  async validatePreCreateItem(
    item: CreateExceptionListItemOptions
  ): Promise<CreateExceptionListItemOptions> {
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
    await this.validateHasWritePrivilege();
    await this.validateCanDeleteItemInActiveSpace(currentItem);
  }

  async validatePreGetOneItem(currentItem: ExceptionListItemSchema): Promise<void> {
    await this.validateHasReadPrivilege();
    await this.validateCanReadItemInActiveSpace(currentItem);
  }

  async validatePreMultiListFind(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreExport(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreSingleListFind(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreGetListSummary(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  private async validateTrustedDeviceData(item: ExceptionItemLikeOptions): Promise<void> {
    await this.validateBasicData(item);

    try {
      TrustedDeviceDataSchema.validate(item);
    } catch (error) {
      throw new EndpointArtifactExceptionValidationError(error.message);
    }
  }
}
