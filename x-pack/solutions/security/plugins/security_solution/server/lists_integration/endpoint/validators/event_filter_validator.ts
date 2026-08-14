/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';

import type {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '@kbn/lists-plugin/server';

import {
  DESCENDANT_EVENT_SCOPE_CATEGORIES,
  DESCENDANT_EVENT_SCOPE_TAG_PREFIX,
  FILTER_PROCESS_DESCENDANTS_TAG,
} from '../../../../common/endpoint/service/artifacts/constants';
import {
  getDescendantEventScopeValues,
  isDescendantEventScopeCategory,
  isDescendantEventScopeTag,
  isProcessDescendantsEnabled,
} from '../../../../common/endpoint/service/artifacts/utils';
import type { ExceptionItemLikeOptions } from '../types';

import { BaseValidator } from './base_validator';
import { EndpointArtifactExceptionValidationError } from './errors';

const EventFilterDataSchema = schema.object(
  {
    entries: schema.arrayOf(
      schema.object(
        {
          field: schema.string(),
        },
        { unknowns: 'ignore' }
      ),
      { minSize: 1 }
    ),
  },
  {
    unknowns: 'ignore',
  }
);

export class EventFilterValidator extends BaseValidator {
  static isEventFilter(item: { listId: string }): boolean {
    return item.listId === ENDPOINT_ARTIFACT_LISTS.eventFilters.id;
  }

  protected async validateHasWritePrivilege(): Promise<void> {
    return super.validateHasPrivilege('canWriteEventFilters');
  }

  protected async validateHasReadPrivilege(): Promise<void> {
    return super.validateHasPrivilege('canReadEventFilters');
  }

  async validatePreCreateItem(item: CreateExceptionListItemOptions) {
    await this.validateHasWritePrivilege();
    await this.validateEventFilterData(item);

    // user can always create a global entry so additional checks not needed
    if (this.isItemByPolicy(item)) {
      await this.validateCanCreateByPolicyArtifacts(item);
      await this.validateByPolicyItem(item);
    }

    await this.validateCreateOwnerSpaceIds(item);
    await this.validateCanCreateGlobalArtifacts(item);

    return item;
  }

  async validatePreUpdateItem(
    _updatedItem: UpdateExceptionListItemOptions,
    currentItem: ExceptionListItemSchema
  ): Promise<UpdateExceptionListItemOptions> {
    const updatedItem = _updatedItem as ExceptionItemLikeOptions;

    await this.validateHasWritePrivilege();
    await this.validateEventFilterData(updatedItem);

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

  private async validateEventFilterData(item: ExceptionItemLikeOptions): Promise<void> {
    await this.validateBasicData(item);

    try {
      EventFilterDataSchema.validate(item);
      this.validateDescendantEventScope(item);
    } catch (error) {
      throw new EndpointArtifactExceptionValidationError(error.message);
    }
  }

  /**
   * Validates the (optional) tag that scopes a process descendants event filter down to a set of
   * event categories. Items without that tag keep filtering every event category of the tree.
   */
  private validateDescendantEventScope(item: ExceptionItemLikeOptions): void {
    const tags = item.tags ?? [];

    if (!tags.some(isDescendantEventScopeTag)) {
      return;
    }

    if (!this.endpointAppContext.experimentalFeatures.scopedProcessDescendantEventFiltersEnabled) {
      throw new Error('Scoped process descendants event filtering feature is not enabled');
    }

    if (!isProcessDescendantsEnabled({ tags })) {
      throw new Error(
        `The \`${DESCENDANT_EVENT_SCOPE_TAG_PREFIX}\` tag is only allowed together with the \`${FILTER_PROCESS_DESCENDANTS_TAG}\` tag`
      );
    }

    const eventScopeValues = getDescendantEventScopeValues({ tags });

    if (eventScopeValues.length === 0) {
      throw new Error(
        `The \`${DESCENDANT_EVENT_SCOPE_TAG_PREFIX}\` tag must list at least one event category. Remove the tag to filter all event categories of the process descendants.`
      );
    }

    const invalidCategories = eventScopeValues.filter(
      (value) => !isDescendantEventScopeCategory(value)
    );

    if (invalidCategories.length > 0) {
      throw new Error(
        `Invalid event category [${invalidCategories.join(
          ', '
        )}] in the \`${DESCENDANT_EVENT_SCOPE_TAG_PREFIX}\` tag. Allowed values are: ${DESCENDANT_EVENT_SCOPE_CATEGORIES.join(
          ', '
        )}`
      );
    }
  }

  async validatePreGetOneItem(currentItem: ExceptionListItemSchema): Promise<void> {
    await this.validateHasReadPrivilege();
    await this.validateCanReadItemInActiveSpace(currentItem);
  }

  async validatePreSummary(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreDeleteItem(currentItem: ExceptionListItemSchema): Promise<void> {
    await this.validateHasWritePrivilege();
    await this.validateCanDeleteItemInActiveSpace(currentItem);
  }

  async validatePreExport(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreSingleListFind(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreMultiListFind(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreImport(): Promise<void> {
    throw new EndpointArtifactExceptionValidationError(
      'Import is not supported for Endpoint artifact exceptions'
    );
  }
}
