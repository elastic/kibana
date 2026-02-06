/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListItemOptions,
  ExceptionsListPreCreateItemServerExtension,
} from '@kbn/lists-plugin/server';
import { GLOBAL_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts';
import { EndpointArtifactExceptionValidationError } from '../validators/errors';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import {
  BlocklistValidator,
  EndpointExceptionsValidator,
  EventFilterValidator,
  HostIsolationExceptionsValidator,
  TrustedAppValidator,
  TrustedDeviceValidator,
} from '../validators';
import {
  hasGlobalOrPerPolicyTag,
  setArtifactOwnerSpaceId,
} from '../../../../common/endpoint/service/artifacts/utils';

export const getExceptionsPreCreateItemHandler = (
  endpointAppContext: EndpointAppContextService
): ExceptionsListPreCreateItemServerExtension['callback'] => {
  return async function ({ data, context: { request } }): Promise<CreateExceptionListItemOptions> {
    if (data.namespaceType !== 'agnostic') {
      return data;
    }

    let isEndpointArtifact = false;
    let validatedItem = data;

    // Validate trusted apps
    if (TrustedAppValidator.isTrustedApp(data)) {
      isEndpointArtifact = true;
      const trustedAppValidator = new TrustedAppValidator(endpointAppContext, request);
      validatedItem = await trustedAppValidator.validatePreCreateItem(data);
      trustedAppValidator.notifyFeatureUsage(data, 'TRUSTED_APP_BY_POLICY');
    }

    // Validate trusted devices
    if (TrustedDeviceValidator.isTrustedDevice(data)) {
      isEndpointArtifact = true;
      const trustedDeviceValidator = new TrustedDeviceValidator(endpointAppContext, request);
      validatedItem = await trustedDeviceValidator.validatePreCreateItem(data);
      trustedDeviceValidator.notifyFeatureUsage(data, 'TRUSTED_DEVICE_BY_POLICY');
    }

    // Validate event filter
    if (EventFilterValidator.isEventFilter(data)) {
      isEndpointArtifact = true;
      const eventFilterValidator = new EventFilterValidator(endpointAppContext, request);
      validatedItem = await eventFilterValidator.validatePreCreateItem(data);
      eventFilterValidator.notifyFeatureUsage(data, 'EVENT_FILTERS_BY_POLICY');
    }

    // Validate host isolation
    if (HostIsolationExceptionsValidator.isHostIsolationException(data)) {
      isEndpointArtifact = true;
      const hostIsolationExceptionsValidator = new HostIsolationExceptionsValidator(
        endpointAppContext,
        request
      );
      validatedItem = await hostIsolationExceptionsValidator.validatePreCreateItem(data);
      hostIsolationExceptionsValidator.notifyFeatureUsage(
        data,
        'HOST_ISOLATION_EXCEPTION_BY_POLICY'
      );
      hostIsolationExceptionsValidator.notifyFeatureUsage(data, 'HOST_ISOLATION_EXCEPTION');
    }

    // Validate blocklists
    if (BlocklistValidator.isBlocklist(data)) {
      isEndpointArtifact = true;
      const blocklistValidator = new BlocklistValidator(endpointAppContext, request);
      validatedItem = await blocklistValidator.validatePreCreateItem(data);
      blocklistValidator.notifyFeatureUsage(data, 'BLOCKLIST_BY_POLICY');
    }

    // validate endpoint exceptions
    if (EndpointExceptionsValidator.isEndpointException(data)) {
      isEndpointArtifact = true;
      const endpointExceptionValidator = new EndpointExceptionsValidator(
        endpointAppContext,
        request
      );
      validatedItem = await endpointExceptionValidator.validatePreCreateItem(data);

      if (!endpointAppContext.experimentalFeatures.endpointExceptionsMovedUnderManagement) {
        // If artifact does not have an assignment tag, then add it now. This is in preparation for
        // adding per-policy support to Endpoint Exceptions as well as to support space awareness.
        //
        // Only added when the FF is disabled, as its enabled state indicates per-policy support.
        if (!hasGlobalOrPerPolicyTag(validatedItem)) {
          validatedItem.tags = validatedItem.tags ?? [];
          validatedItem.tags.push(GLOBAL_ARTIFACT_TAG);
        }
      }

      endpointExceptionValidator.notifyFeatureUsage(data, 'ENDPOINT_EXCEPTIONS');
    }

    if (isEndpointArtifact) {
      if (!request) {
        throw new EndpointArtifactExceptionValidationError(`Missing HTTP Request object`);
      }

      const spaceId = (await endpointAppContext.getActiveSpace(request)).id;
      setArtifactOwnerSpaceId(validatedItem, spaceId);

      return validatedItem;
    }

    return isEndpointArtifact ? validatedItem : data;
  };
};
