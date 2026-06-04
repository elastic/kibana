/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { FindExceptionListItemOptions } from '@kbn/lists-plugin/server/services/exception_lists/exception_list_client_types';
import type { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LIST_IDS } from '@kbn/securitysolution-list-constants';

import type { EndpointAppContextService } from '../endpoint_app_context_services';
import { buildSpaceDataFilter } from '../../lists_integration/endpoint/utils/build_space_data_filter';
import { TrustedAppValidator } from '../../lists_integration/endpoint/validators/trusted_app_validator';
import { TrustedDeviceValidator } from '../../lists_integration/endpoint/validators/trusted_device_validator';
import { HostIsolationExceptionsValidator } from '../../lists_integration/endpoint/validators/host_isolation_exceptions_validator';
import { EventFilterValidator } from '../../lists_integration/endpoint/validators/event_filter_validator';
import { BlocklistValidator } from '../../lists_integration/endpoint/validators/blocklist_validator';
import { EndpointExceptionsValidator } from '../../lists_integration/endpoint/validators/endpoint_exceptions_validator';

/**
 * A read-only, request-scoped client for querying endpoint artifact exception lists.
 * Always applies per-artifact-type authorization and active-space filtering.
 *
 * This is NOT a general ExceptionListClient wrapper — it only exposes find operations
 * for known endpoint artifact list IDs.
 */
export class ScopedEndpointArtifactListClient {
  private spaceFilterPromise: Promise<{ filter: string }> | undefined;

  constructor(
    private readonly client: ExceptionListClient,
    private readonly endpointAppContextService: EndpointAppContextService,
    private readonly request: KibanaRequest
  ) {}

  async findEndpointArtifactListItems(
    options: FindExceptionListItemOptions
  ): Promise<FoundExceptionListItemSchema | null> {
    if (!(ENDPOINT_ARTIFACT_LIST_IDS as readonly string[]).includes(options.listId)) {
      throw new Error(`Unknown endpoint artifact list ID: ${options.listId}`);
    }

    const scopedOptions: FindExceptionListItemOptions = {
      ...options,
      namespaceType: 'agnostic',
    };

    await this.validateArtifactAccess(scopedOptions.listId);

    const { filter: spaceFilter } = await this.getSpaceFilter();
    scopedOptions.filter =
      spaceFilter + (scopedOptions.filter ? ` AND (${scopedOptions.filter})` : '');

    return this.client.findExceptionListItem(scopedOptions);
  }

  private getSpaceFilter(): Promise<{ filter: string }> {
    if (!this.spaceFilterPromise) {
      this.spaceFilterPromise = buildSpaceDataFilter(this.endpointAppContextService, this.request);
    }
    return this.spaceFilterPromise;
  }

  // Endpoint artifact read subfeatures include list/exception read API privileges,
  // so this wrapper is at least as strict as the lists plugin's find route (EXCEPTIONS_API_READ).
  private async validateArtifactAccess(listId: string): Promise<void> {
    const { endpointAppContextService, request } = this;
    if (TrustedAppValidator.isTrustedApp({ listId })) {
      await new TrustedAppValidator(endpointAppContextService, request).validatePreSingleListFind();
    } else if (TrustedDeviceValidator.isTrustedDevice({ listId })) {
      await new TrustedDeviceValidator(
        endpointAppContextService,
        request
      ).validatePreSingleListFind();
    } else if (HostIsolationExceptionsValidator.isHostIsolationException({ listId })) {
      await new HostIsolationExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreSingleListFind();
    } else if (EventFilterValidator.isEventFilter({ listId })) {
      await new EventFilterValidator(
        endpointAppContextService,
        request
      ).validatePreSingleListFind();
    } else if (BlocklistValidator.isBlocklist({ listId })) {
      await new BlocklistValidator(endpointAppContextService, request).validatePreSingleListFind();
    } else if (EndpointExceptionsValidator.isEndpointException({ listId })) {
      await new EndpointExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreSingleListFind();
    } else {
      throw new Error(`No validator found for endpoint artifact list ID: ${listId}`);
    }
  }
}
