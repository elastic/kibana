/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '@kbn/lists-plugin/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { PromiseFromStreams } from '@kbn/lists-plugin/server/services/exception_lists/import_exception_list_and_items';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { CUSTOM_YARA_SIGNATURE_FIELD_TYPE } from '../../../../common/endpoint/service/artifacts/constants';
import { BaseValidator } from './base_validator';
import { EndpointArtifactExceptionValidationError } from './errors';
import type { ExceptionItemLikeOptions } from '../types';

/**
 * Maximum YARA rule text size stored in the value field.
 * It's upper bounded by the max length of a `keyword` field in Elasticsearch, which is 32766 characters.
 */
export const MAX_YARA_RULE_CONTENT_LENGTH = 30 * 1024;

const YaraEntrySchema = schema.object({
  field: schema.literal(CUSTOM_YARA_SIGNATURE_FIELD_TYPE),
  operator: schema.literal('included'),
  type: schema.literal('match'),
  value: schema.string({ minLength: 1, maxLength: MAX_YARA_RULE_CONTENT_LENGTH }),
});

const YaraSignatureDataSchema = schema.object(
  {
    name: schema.string({ minLength: 1, maxLength: 256 }),

    description: schema.maybe(schema.string({ minLength: 0, maxLength: 256, defaultValue: '' })),

    namespaceType: schema.literal('agnostic'),

    osTypes: schema.arrayOf(
      schema.oneOf([
        schema.literal(OperatingSystem.WINDOWS),
        schema.literal(OperatingSystem.LINUX),
        schema.literal(OperatingSystem.MAC),
      ]),
      { minSize: 1, maxSize: 3 }
    ),

    entries: schema.arrayOf(YaraEntrySchema, { minSize: 1, maxSize: 1 }),
  },
  {
    unknowns: 'ignore',
  }
);

export class CustomYaraSignaturesValidator extends BaseValidator {
  static isCustomYaraSignature(item: { listId: string }): boolean {
    return item.listId === ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id;
  }

  protected async validateHasWritePrivilege(): Promise<void> {
    return this.validateHasPrivilege('canWriteCustomYaraSignatures');
  }

  protected async validateHasReadPrivilege(): Promise<void> {
    return this.validateHasPrivilege('canReadCustomYaraSignatures');
  }

  async validatePreImport(items: PromiseFromStreams): Promise<void> {
    await this.validateHasWritePrivilege();

    await this.validatePreImportItems(items, async (item) => {
      // import specific validations
      await this.validateImportOwnerSpaceIds(item); // instead of validateCreateOwnerSpaceIds
      await this.validateCanImportGlobalArtifacts(item); // instead of validateCanCreateGlobalArtifacts
      await this.removeInvalidPolicyIds(item); // instead of validateByPolicyItem

      // usual validators from pre-create
      await this.validateCustomYaraSignatureData(item);
      await this.validateCanCreateByPolicyArtifacts(item);
    });
  }

  async validatePreCreateItem(
    item: CreateExceptionListItemOptions
  ): Promise<CreateExceptionListItemOptions> {
    await this.validateHasWritePrivilege();
    await this.validateCustomYaraSignatureData(item);
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
    await this.validateCustomYaraSignatureData(updatedItem);

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

  private async validateCustomYaraSignatureData(item: ExceptionItemLikeOptions): Promise<void> {
    try {
      YaraSignatureDataSchema.validate(item);
    } catch (error) {
      throw new EndpointArtifactExceptionValidationError(error.message);
    }
  }
}
