/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionsListPreSummaryServerExtension } from '@kbn/lists-plugin/server';
import { stringify } from '../../../endpoint/utils/stringify';
import { EndpointArtifactExceptionValidationError } from '../validators/errors';
import { buildSpaceDataFilter } from '../utils';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import {
  BlocklistValidator,
  EndpointExceptionsValidator,
  EventFilterValidator,
  HostIsolationExceptionsValidator,
  TrustedAppValidator,
} from '../validators';

export const getExceptionsPreSummaryHandler = (
  endpointAppContextService: EndpointAppContextService
): ExceptionsListPreSummaryServerExtension['callback'] => {
  const logger = endpointAppContextService.createLogger('listsExceptionsPreSummaryHandler');

  return async function ({ data, context: { request, exceptionListClient } }) {
    if (data.namespaceType !== 'agnostic') {
      return data;
    }

    const { listId: maybeListId, id } = data;
    let listId: string | null | undefined = maybeListId;
    let isEndpointArtifact = false;

    if (!listId && id) {
      listId = (await exceptionListClient.getExceptionList(data))?.list_id ?? null;
    }

    if (!listId) {
      return data;
    }

    // Validate Trusted Applications
    if (TrustedAppValidator.isTrustedApp({ listId })) {
      await new TrustedAppValidator(endpointAppContextService, request).validatePreGetListSummary();
      isEndpointArtifact = true;
    }

    // Host Isolation Exceptions
    if (HostIsolationExceptionsValidator.isHostIsolationException({ listId })) {
      await new HostIsolationExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreSummary();
      isEndpointArtifact = true;
    }

    // Event Filter Exceptions
    if (EventFilterValidator.isEventFilter({ listId })) {
      await new EventFilterValidator(endpointAppContextService, request).validatePreSummary();
      isEndpointArtifact = true;
    }

    // Validate Blocklists
    if (BlocklistValidator.isBlocklist({ listId })) {
      await new BlocklistValidator(endpointAppContextService, request).validatePreGetListSummary();
      isEndpointArtifact = true;
    }

    // Validate Endpoint Exceptions
    if (EndpointExceptionsValidator.isEndpointException({ listId })) {
      await new EndpointExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreGetListSummary();
      isEndpointArtifact = true;
    }

    if (
      isEndpointArtifact &&
      endpointAppContextService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled
    ) {
      if (!request) {
        throw new EndpointArtifactExceptionValidationError(`Missing HTTP Request object`);
      }

      logger.debug(`Summary request prior to adding space filter:\n${stringify(data)}`);

      const spaceFilter = (await buildSpaceDataFilter(endpointAppContextService, request)).filter;

      data.filter = spaceFilter + (data.filter ? ` AND (${data.filter})` : '');

      logger.debug(`Summary request after adding space filter:\n${stringify(data)}`);
    }

    return data;
  };
};
