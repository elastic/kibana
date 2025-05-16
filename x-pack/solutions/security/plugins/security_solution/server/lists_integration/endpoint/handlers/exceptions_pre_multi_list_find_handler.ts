/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionsListPreMultiListFindServerExtension } from '@kbn/lists-plugin/server';
import { EndpointArtifactExceptionValidationError } from '../validators/errors';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import {
  BlocklistValidator,
  EndpointExceptionsValidator,
  EventFilterValidator,
  HostIsolationExceptionsValidator,
  TrustedAppValidator,
} from '../validators';
import { setFindRequestFilterScopeToActiveSpace } from '../utils';

export const getExceptionsPreMultiListFindHandler = (
  endpointAppContextService: EndpointAppContextService
): ExceptionsListPreMultiListFindServerExtension['callback'] => {
  return async function ({ data, context: { request } }) {
    if (!data.namespaceType.includes('agnostic')) {
      return data;
    }

    let isEndpointArtifact = false;

    if (data.listId.some((id) => TrustedAppValidator.isTrustedApp({ listId: id }))) {
      // validate Trusted application
      isEndpointArtifact = true;
      await new TrustedAppValidator(endpointAppContextService, request).validatePreMultiListFind();
    } else if (
      data.listId.some((listId) =>
        HostIsolationExceptionsValidator.isHostIsolationException({ listId })
      )
    ) {
      // Validate Host Isolation Exceptions
      isEndpointArtifact = true;
      await new HostIsolationExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreMultiListFind();
    } else if (data.listId.some((listId) => EventFilterValidator.isEventFilter({ listId }))) {
      // Event Filters Exceptions
      isEndpointArtifact = true;
      await new EventFilterValidator(endpointAppContextService, request).validatePreMultiListFind();
    } else if (data.listId.some((id) => BlocklistValidator.isBlocklist({ listId: id }))) {
      // validate Blocklist
      isEndpointArtifact = true;
      await new BlocklistValidator(endpointAppContextService, request).validatePreMultiListFind();
    } else if (
      data.listId.some((id) => EndpointExceptionsValidator.isEndpointException({ listId: id }))
    ) {
      // Validate Endpoint Exceptions
      isEndpointArtifact = true;
      await new EndpointExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreMultiListFind();
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
