/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionsListPreImportServerExtension } from '@kbn/lists-plugin/server';
import {
  ENDPOINT_ARTIFACT_LIST_IDS,
  ENDPOINT_ARTIFACT_LISTS,
} from '@kbn/securitysolution-list-constants';
import type { PromiseFromStreams } from '@kbn/lists-plugin/server/services/exception_lists/import_exception_list_and_items';
import type { ImportQuerySchemaDecoded } from '@kbn/securitysolution-io-ts-types';
import { hasArtifactOwnerSpaceId } from '../../../../common/endpoint/service/artifacts/utils';
import { stringify } from '../../../endpoint/utils/stringify';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { GLOBAL_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts/constants';
import { EndpointArtifactExceptionValidationError } from '../validators/errors';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import {
  BlocklistValidator,
  EndpointExceptionsValidator,
  EventFilterValidator,
  HostIsolationExceptionsValidator,
  TrustedAppValidator,
  TrustedDeviceValidator,
} from '../validators';

export const getExceptionsPreImportHandler = (
  endpointAppContext: EndpointAppContextService
): ExceptionsListPreImportServerExtension['callback'] => {
  return async ({ data, context: { request } }): Promise<PromiseFromStreams> => {
    validateCanEndpointArtifactsBeImported(data, endpointAppContext.experimentalFeatures);
    provideSpaceAwarenessCompatibilityForOldEndpointExceptions(data, endpointAppContext);

    if (!endpointAppContext.experimentalFeatures.endpointExceptionsMovedUnderManagement) {
      return data;
    }

    const importedListIds = new Set<string>();
    for (const item of [...data.lists, ...data.items]) {
      if ('list_id' in item) {
        importedListIds.add(item.list_id);
      }
    }

    const query: ImportQuerySchemaDecoded = {
      as_new_list: false,
      overwrite: false,
      overwrite_action_connectors: false,
      overwrite_exceptions: false,
      ...(request?.query ?? {}),
    } as ImportQuerySchemaDecoded;

    console.log(
      '🧀 exceptions_pre_import_handler.ts:52 🥭 ',
      JSON.stringify({ query }, null, ' '),
      query.as_new_list,
      query.overwrite,
      query.overwrite_action_connectors,
      query.overwrite_exceptions
    );

    const hasEndpointArtifact = ENDPOINT_ARTIFACT_LIST_IDS.some((endpointListId) =>
      importedListIds.has(endpointListId)
    );

    if (!hasEndpointArtifact) {
      return data;
    }

    if (importedListIds.size > 1) {
      throw new EndpointArtifactExceptionValidationError(
        'Importing multiple Endpoint artifact exception lists is not supported'
      );
    }

    const importedListId = Array.from(importedListIds)[0];

    // todo better typing
    if (request && (request.query as ImportQuerySchemaDecoded).overwrite) {
      (request.query as ImportQuerySchemaDecoded).overwrite = false;
    }

    console.log(
      '🧀 exceptions_pre_import_handler.ts:86 🥭 ',
      JSON.stringify({ newQuery: request?.query }, null, ' ')
    );

    // Validate trusted apps
    if (TrustedAppValidator.isTrustedApp({ listId: importedListId })) {
      const trustedAppValidator = new TrustedAppValidator(endpointAppContext, request);
      await trustedAppValidator.validatePreImport(data);
    }

    // Validate trusted devices
    if (TrustedDeviceValidator.isTrustedDevice({ listId: importedListId })) {
      const trustedDeviceValidator = new TrustedDeviceValidator(endpointAppContext, request);
      await trustedDeviceValidator.validatePreImport(data);
    }

    // Validate event filter
    if (EventFilterValidator.isEventFilter({ listId: importedListId })) {
      const eventFilterValidator = new EventFilterValidator(endpointAppContext, request);
      await eventFilterValidator.validatePreImport(data);
    }

    // Validate host isolation
    if (HostIsolationExceptionsValidator.isHostIsolationException({ listId: importedListId })) {
      const hostIsolationExceptionsValidator = new HostIsolationExceptionsValidator(
        endpointAppContext,
        request
      );
      await hostIsolationExceptionsValidator.validatePreImport(data);
    }

    // Validate blocklists
    if (BlocklistValidator.isBlocklist({ listId: importedListId })) {
      const blocklistValidator = new BlocklistValidator(endpointAppContext, request);
      await blocklistValidator.validatePreImport(data);
    }

    // validate endpoint exceptions
    if (EndpointExceptionsValidator.isEndpointException({ listId: importedListId })) {
      const endpointExceptionValidator = new EndpointExceptionsValidator(
        endpointAppContext,
        request
      );
      await endpointExceptionValidator.validatePreImport(data);
    }

    return data;
  };
};

const validateCanEndpointArtifactsBeImported = (
  data: PromiseFromStreams,
  experimentalFeatures: ExperimentalFeatures
) => {
  if (experimentalFeatures.endpointExceptionsMovedUnderManagement) {
    return;
  }

  const NON_IMPORTABLE_ENDPOINT_ARTIFACT_IDS = ENDPOINT_ARTIFACT_LIST_IDS.filter(
    (listId) => listId !== ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
  ) as string[];

  const hasEndpointArtifactListOrListItems = [...data.lists, ...data.items].some((item) => {
    if ('list_id' in item) {
      return NON_IMPORTABLE_ENDPOINT_ARTIFACT_IDS.includes(item.list_id);
    }

    return false;
  });

  if (hasEndpointArtifactListOrListItems) {
    throw new EndpointArtifactExceptionValidationError(
      'Import is not supported for Endpoint artifact exceptions'
    );
  }
};

/** Temporary Work-around:
 * v9.1.0 introduced support for spaces, which also now requires that each endpoint exception
 * have the `global` tag, or else they will not be returned via API. Since Endpoint
 * Exceptions continue to be global only in v9.1, we add the global tag to them here if it is
 * missing
 */
const provideSpaceAwarenessCompatibilityForOldEndpointExceptions = (
  data: PromiseFromStreams,
  endpointAppContextService: EndpointAppContextService
) => {
  const logger = endpointAppContextService.createLogger('listsPreImportExtensionPoint');

  const adjustedImportItems: PromiseFromStreams['items'] = [];

  for (const item of data.items) {
    if (
      !(item instanceof Error) &&
      item.list_id === ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id &&
      !hasArtifactOwnerSpaceId(item)
    ) {
      item.tags = item.tags ?? [];
      item.tags.push(GLOBAL_ARTIFACT_TAG);
      adjustedImportItems.push(item);
    }
  }

  if (adjustedImportItems.length > 0) {
    logger.debug(`The following Endpoint Exceptions item imports were adjusted to include the Global artifact tag:
 ${stringify(adjustedImportItems)}`);
  }
};
