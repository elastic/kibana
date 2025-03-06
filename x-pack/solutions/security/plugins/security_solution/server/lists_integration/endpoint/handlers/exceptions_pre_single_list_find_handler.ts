/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionsListPreSingleListFindServerExtension } from '@kbn/lists-plugin/server';
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

    const { listId } = data;

    // Validate Trusted applications
    if (TrustedAppValidator.isTrustedApp({ listId })) {
      await new TrustedAppValidator(endpointAppContextService, request).validatePreSingleListFind(
        data
      );
      return data;
    }

    // Host Isolation Exceptions
    if (HostIsolationExceptionsValidator.isHostIsolationException({ listId })) {
      await new HostIsolationExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreSingleListFind(data);
      return data;
    }

    // Event Filters Exceptions
    if (EventFilterValidator.isEventFilter({ listId })) {
      await new EventFilterValidator(endpointAppContextService, request).validatePreSingleListFind(
        data
      );
      return data;
    }

    // Validate Blocklists
    if (BlocklistValidator.isBlocklist({ listId })) {
      await new BlocklistValidator(endpointAppContextService, request).validatePreSingleListFind(
        data
      );
      return data;
    }

    // Validate Endpoint Exceptions
    if (EndpointExceptionsValidator.isEndpointException({ listId })) {
      await new EndpointExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreSingleListFind(data);
      return data;
    }

    return data;
  };
};
