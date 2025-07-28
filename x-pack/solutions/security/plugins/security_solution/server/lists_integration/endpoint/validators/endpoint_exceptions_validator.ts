/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '@kbn/lists-plugin/server';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EndpointExceptionsValidationError } from './endpoint_exception_errors';
import { BaseValidator, GLOBAL_ARTIFACT_MANAGEMENT_NOT_ALLOWED_MESSAGE } from './base_validator';

export class EndpointExceptionsValidator extends BaseValidator {
  static isEndpointException(item: { listId: string }): boolean {
    return item.listId === ENDPOINT_LIST_ID;
  }

  protected async validateHasReadPrivilege(): Promise<void> {
    return this.validateHasEndpointExceptionsPrivileges('canReadEndpointExceptions');
  }

  protected async validateHasWritePrivilege(): Promise<void> {
    await this.validateHasEndpointExceptionsPrivileges('canWriteEndpointExceptions');

    if (this.endpointAppContext.experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
      // Endpoint Exceptions are currently ONLY global, so we need to make sure the user
      // also has the new Global Artifacts privilege
      try {
        await this.validateHasPrivilege('canManageGlobalArtifacts');
      } catch (error) {
        // We provide a more detailed error here
        throw new EndpointExceptionsValidationError(
          `${error.message}. ${GLOBAL_ARTIFACT_MANAGEMENT_NOT_ALLOWED_MESSAGE}`,
          403
        );
      }
    }
  }

  async validatePreCreateItem(item: CreateExceptionListItemOptions) {
    await this.validateHasWritePrivilege();
    await this.validateCanCreateGlobalArtifacts(item);
    await this.validateCreateOwnerSpaceIds(item);

    return item;
  }

  async validatePreUpdateItem(
    item: UpdateExceptionListItemOptions,
    currentItem: ExceptionListItemSchema
  ) {
    await this.validateHasWritePrivilege();
    await this.validateUpdateOwnerSpaceIds(item, currentItem);
    await this.validateCanUpdateItemInActiveSpace(item, currentItem);

    return item;
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
}
