/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListClient,
  ExceptionsListPreImportServerExtension,
} from '@kbn/lists-plugin/server';
import {
  ENDPOINT_ARTIFACT_LIST_IDS,
  ENDPOINT_ARTIFACT_LISTS,
} from '@kbn/securitysolution-list-constants';
import type { PromiseFromStreams } from '@kbn/lists-plugin/server/services/exception_lists/import_exception_list_and_items';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import {
  buildSpaceOwnerIdTag,
  hasArtifactOwnerSpaceId,
} from '../../../../common/endpoint/service/artifacts/utils';
import { stringify } from '../../../endpoint/utils/stringify';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import {
  GLOBAL_ARTIFACT_TAG,
  IMPORTED_ARTIFACT_TAG,
} from '../../../../common/endpoint/service/artifacts/constants';
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
import { buildSpaceDataFilter } from '../utils';

export const getExceptionsPreImportHandler = (
  endpointAppContext: EndpointAppContextService
): ExceptionsListPreImportServerExtension['callback'] => {
  return async ({
    data: { data, overwrite },
    context: { request, exceptionListClient },
  }): ReturnType<ExceptionsListPreImportServerExtension['callback']> => {
    const logger = endpointAppContext.createLogger('listsPreImportExtensionPoint');

    validateCanEndpointArtifactsBeImported(data, endpointAppContext.experimentalFeatures);
    provideSpaceAwarenessCompatibilityForOldEndpointExceptions(data, logger);

    if (!endpointAppContext.experimentalFeatures.endpointExceptionsMovedUnderManagement) {
      return { data, overwrite };
    }

    // --- Below are the validations/operations when Import/Export is allowed for all endpoint artifacts based on FF ---

    const importedListIds = new Set<string>();
    for (const item of [...data.lists, ...data.items]) {
      if ('list_id' in item) {
        importedListIds.add(item.list_id);
      }
    }

    const hasEndpointArtifact = ENDPOINT_ARTIFACT_LIST_IDS.some((endpointListId) =>
      importedListIds.has(endpointListId)
    );

    if (!hasEndpointArtifact) {
      return { data, overwrite };
    }

    if (importedListIds.size > 1) {
      throw new EndpointArtifactExceptionValidationError(
        'Importing multiple Endpoint artifact exception lists is not supported'
      );
    }

    const importedListId = Array.from(importedListIds)[0];

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

    // --- Below are operations to prepare the imported data ---
    addImportedCommentToItems(data);
    addImportedTagToItems(data);

    if (!overwrite) {
      return { data, overwrite };
    }

    // --- From this point, we're starting to perform operations on SOs in order to prepare OVERWRITING EXISTING LIST. ---
    //  All validations must be above

    await deleteExistingItemsForOverwrite({
      data,
      exceptionListClient,
      endpointAppContext,
      request,
      importedListId,
      logger,
    });

    return {
      data,

      // We're not allowing the list API to overwrite the list, as it would delete all items.
      // Instead, we're 'simulating' the overwrite behaviour here, in the extension.
      overwrite: false,
    };
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
  logger: Logger
) => {
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

const deleteExistingItemsForOverwrite = async ({
  data,
  exceptionListClient,
  endpointAppContext,
  request,
  importedListId,
  logger,
}: {
  data: PromiseFromStreams;
  exceptionListClient: ExceptionListClient;
  endpointAppContext: EndpointAppContextService;
  request: KibanaRequest | undefined;
  importedListId: string;
  logger: Logger;
}) => {
  if (!request) {
    throw new EndpointArtifactExceptionValidationError(
      'Unable to determine space id. Missing HTTP Request object',
      500
    );
  }

  // Let's not pass the `list` to the list API, to avoid conflict issue due to the `overwrite` query param is disabled on that level.
  data.lists = [];

  // Delete items from the list API if overwrite is true, to simulate the overwrite behaviour,
  // as we disabled the overwrite query param on the list API level to avoid conflict issue.
  const spaceId = (await endpointAppContext.getActiveSpace(request)).id;

  const canManageGlobalArtifacts = (await endpointAppContext.getEndpointAuthz(request))
    .canManageGlobalArtifacts;

  let filter: string;
  if (canManageGlobalArtifacts) {
    const filterForAllItemsVisibleInCurrentSpace = (
      await buildSpaceDataFilter(endpointAppContext, request)
    ).filter;

    filter = filterForAllItemsVisibleInCurrentSpace;
  } else {
    const notGlobalExceptionFilter = `NOT exception-list-agnostic.attributes.tags:"${GLOBAL_ARTIFACT_TAG}"`;
    const createdInCurrentSpaceExceptionFilter = `exception-list-agnostic.attributes.tags:"${buildSpaceOwnerIdTag(
      spaceId
    )}"`;

    const filterForNonGlobalItemsOwnedByCurrentSpace = `${notGlobalExceptionFilter} AND ${createdInCurrentSpaceExceptionFilter} `;

    filter = filterForNonGlobalItemsOwnedByCurrentSpace;
  }

  const findResult = await exceptionListClient.findExceptionListItem({
    listId: importedListId,
    namespaceType: 'agnostic',
    filter,
    page: 1,
    perPage: 1_000,
    sortField: undefined,
    sortOrder: undefined,
  });

  if (findResult?.total && findResult.total > 0) {
    await exceptionListClient.bulkDeleteExceptionListItems({
      ids: findResult.data.map((item) => item.id) ?? [],
      namespaceType: 'agnostic',
    });

    logger.info(
      `Deleted ${
        findResult.data.length
      } items from list [${importedListId}] in space [${spaceId}] to prepare for import with overwrite${
        canManageGlobalArtifacts ? ', including global artifacts' : ''
      }.`
    );
  } else {
    logger.info('No exception list items found to delete on import with overwrite.');
  }
};

const addImportedCommentToItems = (data: PromiseFromStreams): void => {
  for (const item of data.items) {
    if (!(item instanceof Error)) {
      item.comments = [
        ...(item.comments ?? []),
        {
          comment: `Imported artifact.\nOriginally created by "${
            item.created_by ?? 'unknown'
          }" at "${item.created_at ?? 'unknown'}".`,
        },
      ];
    }
  }
};

const addImportedTagToItems = (data: PromiseFromStreams): void => {
  for (const item of data.items) {
    if (!(item instanceof Error)) {
      item.tags = [...(item.tags ?? []), IMPORTED_ARTIFACT_TAG];
    }
  }
};
