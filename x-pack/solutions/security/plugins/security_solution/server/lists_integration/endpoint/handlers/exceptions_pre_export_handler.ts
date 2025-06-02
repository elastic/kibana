/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionsListPreExportServerExtension } from '@kbn/lists-plugin/server';
import { EndpointArtifactExceptionValidationError } from '../validators/errors';
import { stringify } from '../../../endpoint/utils/stringify';
import { buildSpaceDataFilter } from '../utils';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import {
  BlocklistValidator,
  EndpointExceptionsValidator,
  EventFilterValidator,
  HostIsolationExceptionsValidator,
  TrustedAppValidator,
} from '../validators';

export const getExceptionsPreExportHandler = (
  endpointAppContextService: EndpointAppContextService
): ExceptionsListPreExportServerExtension['callback'] => {
  const logger = endpointAppContextService.createLogger('listsExceptionsPreExportHandler');

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
      isEndpointArtifact = true;
      await new TrustedAppValidator(endpointAppContextService, request).validatePreExport();
    }

    // Host Isolation Exceptions validations
    if (HostIsolationExceptionsValidator.isHostIsolationException({ listId })) {
      isEndpointArtifact = true;
      await new HostIsolationExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreExport();
    }

    // Event Filter validations
    if (EventFilterValidator.isEventFilter({ listId })) {
      isEndpointArtifact = true;
      await new EventFilterValidator(endpointAppContextService, request).validatePreExport();
    }

    // Validate Blocklists
    if (BlocklistValidator.isBlocklist({ listId })) {
      isEndpointArtifact = true;
      await new BlocklistValidator(endpointAppContextService, request).validatePreExport();
    }

    // Validate Endpoint Exceptions
    if (EndpointExceptionsValidator.isEndpointException({ listId })) {
      isEndpointArtifact = true;
      await new EndpointExceptionsValidator(endpointAppContextService, request).validatePreExport();
    }

    // If space awareness is enabled, add space filter to export options
    if (
      isEndpointArtifact &&
      endpointAppContextService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled
    ) {
      if (!request) {
        throw new EndpointArtifactExceptionValidationError(`Missing HTTP Request object`);
      }

      const spaceDataFilter = (await buildSpaceDataFilter(endpointAppContextService, request))
        .filter;

      data.filter = spaceDataFilter + (data.filter ? ` AND (${data.filter})` : '');

      logger.debug(`Export request after adding space filter:\n${stringify(data)}`);
    }

    return data;
  };
};
