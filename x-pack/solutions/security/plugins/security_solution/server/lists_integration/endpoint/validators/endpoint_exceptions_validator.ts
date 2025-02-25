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
import { hasArtifactOwnerSpaceId } from '../../../../common/endpoint/service/artifacts/utils';
import { BaseValidator } from './base_validator';

export class EndpointExceptionsValidator extends BaseValidator {
  static isEndpointException(item: { listId: string }): boolean {
    return item.listId === ENDPOINT_LIST_ID;
  }

  protected async validateHasReadPrivilege(): Promise<void> {
    return this.validateHasEndpointExceptionsPrivileges('canReadEndpointExceptions');
  }

  protected async validateHasWritePrivilege(): Promise<void> {
    return this.validateHasEndpointExceptionsPrivileges('canWriteEndpointExceptions');
  }

  async validatePreCreateItem(item: CreateExceptionListItemOptions) {
    await this.validateHasWritePrivilege();
    await this.validateCreateOwnerSpaceIds(item);

    await this.setOwnerSpaceId(item);

    return item;
  }

  async validatePreUpdateItem(
    item: UpdateExceptionListItemOptions,
    currentItem: ExceptionListItemSchema
  ) {
    await this.validateHasWritePrivilege();
    await this.validateUpdateOwnerSpaceIds(item, currentItem);

    if (!hasArtifactOwnerSpaceId(item)) {
      await this.setOwnerSpaceId(item);
    }

    return item;
  }

  async validatePreDeleteItem(): Promise<void> {
    await this.validateHasWritePrivilege();
  }

  async validatePreGetOneItem(): Promise<void> {
    await this.validateHasReadPrivilege();
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
