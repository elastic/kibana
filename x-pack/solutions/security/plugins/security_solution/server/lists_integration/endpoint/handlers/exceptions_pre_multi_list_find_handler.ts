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
  TrustedDeviceValidator,
  CustomYaraSignaturesValidator,
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

    // validate Trusted application
    if (data.listId.some((id) => TrustedAppValidator.isTrustedApp({ listId: id }))) {
      isEndpointArtifact = true;
      await new TrustedAppValidator(endpointAppContextService, request).validatePreMultiListFind();
    }

    // validate Trusted Devices
    if (data.listId.some((id) => TrustedDeviceValidator.isTrustedDevice({ listId: id }))) {
      isEndpointArtifact = true;
      await new TrustedDeviceValidator(
        endpointAppContextService,
        request
      ).validatePreMultiListFind();
    }

    // Validate Host Isolation Exceptions
    if (
      data.listId.some((listId) =>
        HostIsolationExceptionsValidator.isHostIsolationException({ listId })
      )
    ) {
      isEndpointArtifact = true;
      await new HostIsolationExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreMultiListFind();
    }

    // Event Filters
    if (data.listId.some((listId) => EventFilterValidator.isEventFilter({ listId }))) {
      isEndpointArtifact = true;
      await new EventFilterValidator(endpointAppContextService, request).validatePreMultiListFind();
    }

    // validate Blocklist
    if (data.listId.some((id) => BlocklistValidator.isBlocklist({ listId: id }))) {
      isEndpointArtifact = true;
      await new BlocklistValidator(endpointAppContextService, request).validatePreMultiListFind();
    }

    // validate Custom YARA signatures
    if (
      data.listId.some((id) => CustomYaraSignaturesValidator.isCustomYaraSignature({ listId: id }))
    ) {
      isEndpointArtifact = true;
      await new CustomYaraSignaturesValidator(
        endpointAppContextService,
        request
      ).validatePreMultiListFind();
    }

    // Validate Endpoint Exceptions
    if (data.listId.some((id) => EndpointExceptionsValidator.isEndpointException({ listId: id }))) {
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
