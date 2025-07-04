/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionsListPreUpdateItemServerExtension,
  UpdateExceptionListItemOptions,
} from '@kbn/lists-plugin/server';
import { GLOBAL_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts';
import { EndpointArtifactExceptionValidationError } from '../validators/errors';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { ExceptionItemLikeOptions } from '../types';
import {
  BlocklistValidator,
  EndpointExceptionsValidator,
  EventFilterValidator,
  HostIsolationExceptionsValidator,
  TrustedAppValidator,
} from '../validators';
import {
  hasArtifactOwnerSpaceId,
  hasGlobalOrPerPolicyTag,
  setArtifactOwnerSpaceId,
} from '../../../../common/endpoint/service/artifacts/utils';

export const getExceptionsPreUpdateItemHandler = (
  endpointAppContextService: EndpointAppContextService
): ExceptionsListPreUpdateItemServerExtension['callback'] => {
  return async function ({
    data,
    context: { request, exceptionListClient },
  }): Promise<UpdateExceptionListItemOptions> {
    if (data.namespaceType !== 'agnostic') {
      return data;
    }

    let isEndpointArtifact = false;
    let validatedItem = data;
    const currentSavedItem = await exceptionListClient.getExceptionListItem({
      id: data.id,
      itemId: data.itemId,
      namespaceType: data.namespaceType,
    });

    // We don't want to `throw` here because we don't know for sure that the item is one we care about.
    // So we just return the data and the Lists plugin will likely error out because it can't find the item
    if (!currentSavedItem) {
      return data;
    }

    const listId = currentSavedItem.list_id;

    // Validate Trusted Applications
    if (TrustedAppValidator.isTrustedApp({ listId })) {
      isEndpointArtifact = true;
      const trustedAppValidator = new TrustedAppValidator(endpointAppContextService, request);
      validatedItem = await trustedAppValidator.validatePreUpdateItem(data, currentSavedItem);
      trustedAppValidator.notifyFeatureUsage(
        data as ExceptionItemLikeOptions,
        'TRUSTED_APP_BY_POLICY'
      );
    }

    // Validate Event Filters
    if (EventFilterValidator.isEventFilter({ listId })) {
      isEndpointArtifact = true;
      const eventFilterValidator = new EventFilterValidator(endpointAppContextService, request);
      validatedItem = await eventFilterValidator.validatePreUpdateItem(data, currentSavedItem);
      eventFilterValidator.notifyFeatureUsage(
        data as ExceptionItemLikeOptions,
        'EVENT_FILTERS_BY_POLICY'
      );
    }

    // Validate host isolation
    if (HostIsolationExceptionsValidator.isHostIsolationException({ listId })) {
      isEndpointArtifact = true;
      const hostIsolationExceptionValidator = new HostIsolationExceptionsValidator(
        endpointAppContextService,
        request
      );
      validatedItem = await hostIsolationExceptionValidator.validatePreUpdateItem(
        data,
        currentSavedItem
      );
      hostIsolationExceptionValidator.notifyFeatureUsage(
        data as ExceptionItemLikeOptions,
        'HOST_ISOLATION_EXCEPTION_BY_POLICY'
      );
      hostIsolationExceptionValidator.notifyFeatureUsage(
        data as ExceptionItemLikeOptions,
        'HOST_ISOLATION_EXCEPTION'
      );
    }

    // Validate Blocklists
    if (BlocklistValidator.isBlocklist({ listId })) {
      isEndpointArtifact = true;
      const blocklistValidator = new BlocklistValidator(endpointAppContextService, request);
      validatedItem = await blocklistValidator.validatePreUpdateItem(data, currentSavedItem);
      blocklistValidator.notifyFeatureUsage(
        data as ExceptionItemLikeOptions,
        'BLOCKLIST_BY_POLICY'
      );
    }

    // Validate Endpoint Exceptions
    if (EndpointExceptionsValidator.isEndpointException({ listId })) {
      isEndpointArtifact = true;
      const endpointExceptionValidator = new EndpointExceptionsValidator(
        endpointAppContextService,
        request
      );
      validatedItem = await endpointExceptionValidator.validatePreUpdateItem(
        data,
        currentSavedItem
      );

      // If artifact does not have an assignment tag, then add it now. This is in preparation for
      // adding per-policy support to Endpoint Exceptions as well as to support space awareness
      if (!hasGlobalOrPerPolicyTag(validatedItem)) {
        validatedItem.tags = validatedItem.tags ?? [];
        validatedItem.tags.push(GLOBAL_ARTIFACT_TAG);
      }

      endpointExceptionValidator.notifyFeatureUsage(
        data as ExceptionItemLikeOptions,
        'ENDPOINT_EXCEPTIONS'
      );
    }

    if (
      isEndpointArtifact &&
      endpointAppContextService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled
    ) {
      if (!hasArtifactOwnerSpaceId(validatedItem)) {
        if (!request) {
          throw new EndpointArtifactExceptionValidationError(`Missing HTTP Request object`);
        }
        const spaceId = (await endpointAppContextService.getActiveSpace(request)).id;
        setArtifactOwnerSpaceId(validatedItem, spaceId);
      }

      return validatedItem;
    }

    return isEndpointArtifact ? validatedItem : data;
  };
};
