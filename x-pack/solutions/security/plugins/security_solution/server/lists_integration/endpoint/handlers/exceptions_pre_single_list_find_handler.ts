/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionsListPreSingleListFindServerExtension } from '@kbn/lists-plugin/server';
import { EndpointArtifactExceptionValidationError } from '../validators/errors';
import { setFindRequestFilterScopeToActiveSpace } from '../utils';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import {
  BlocklistValidator,
  EndpointExceptionsValidator,
  EventFilterValidator,
  HostIsolationExceptionsValidator,
  TrustedAppValidator,
} from '../validators';

export const getExceptionsPreSingleListFindHandler = (
  endpointAppContextService: EndpointAppContextService
): ExceptionsListPreSingleListFindServerExtension['callback'] => {
  return async function ({ data, context: { request } }) {
    if (data.namespaceType !== 'agnostic') {
      return data;
    }

    let isEndpointArtifact = false;

    const { listId } = data;

    if (TrustedAppValidator.isTrustedApp({ listId })) {
      // Validate Trusted applications
      isEndpointArtifact = true;
      await new TrustedAppValidator(endpointAppContextService, request).validatePreSingleListFind();
    } else if (HostIsolationExceptionsValidator.isHostIsolationException({ listId })) {
      // Host Isolation Exceptions
      isEndpointArtifact = true;
      await new HostIsolationExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreSingleListFind();
    } else if (EventFilterValidator.isEventFilter({ listId })) {
      // Event Filters Exceptions
      isEndpointArtifact = true;
      await new EventFilterValidator(
        endpointAppContextService,
        request
      ).validatePreSingleListFind();
    }

    // Validate Blocklists
    if (BlocklistValidator.isBlocklist({ listId })) {
      await new BlocklistValidator(endpointAppContextService, request).validatePreSingleListFind();
    } else if (EndpointExceptionsValidator.isEndpointException({ listId })) {
      // Validate Endpoint Exceptions
      isEndpointArtifact = true;
      await new EndpointExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreSingleListFind();
    } else if (EndpointExceptionsValidator.isEndpointException({ listId })) {
      // Validate Endpoint Exceptions
      isEndpointArtifact = true;
      await new EndpointExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreSingleListFind();
    }

    if (isEndpointArtifact) {
      if (!request) {
        throw new EndpointArtifactExceptionValidationError(`Missing HTTP Request object`);
      }

      await setFindRequestFilterScopeToActiveSpace(endpointAppContextService, request, data);
    }

    return data;
  };
};
