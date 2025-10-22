/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionsListPreImportServerExtension } from '@kbn/lists-plugin/server';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type { PromiseFromStreams } from '@kbn/lists-plugin/server/services/exception_lists/import_exception_list_and_items';
import { stringify } from '../../../endpoint/utils/stringify';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import {
  ALL_ENDPOINT_ARTIFACT_LIST_IDS,
  GLOBAL_ARTIFACT_TAG,
} from '../../../../common/endpoint/service/artifacts/constants';
import { EndpointArtifactExceptionValidationError } from '../validators/errors';

export const getExceptionsPreImportHandler = (
  endpointAppContextService: EndpointAppContextService
): ExceptionsListPreImportServerExtension['callback'] => {
  const logger = endpointAppContextService.createLogger('listsPreImportExtensionPoint');

  return async ({ data }) => {
    const hasEndpointArtifactListOrListItems = [...data.lists, ...data.items].some((item) => {
      if ('list_id' in item) {
        const NON_IMPORTABLE_ENDPOINT_ARTIFACT_IDS = ALL_ENDPOINT_ARTIFACT_LIST_IDS.filter(
          (listId) => listId !== ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
        ) as string[];

        return NON_IMPORTABLE_ENDPOINT_ARTIFACT_IDS.includes(item.list_id);
      }

      return false;
    });

    if (hasEndpointArtifactListOrListItems) {
      throw new EndpointArtifactExceptionValidationError(
        'Import is not supported for Endpoint artifact exceptions'
      );
    }

    // Temporary Work-around:
    // v9.1.0 introduced support for spaces, which also now requires that each endpoint exception
    // have the `global` tag, or else they will not be returned via API. Since Endpoint
    // Exceptions continue to be global only in v9.1, we add the global tag to them here if it is
    // missing
    const adjustedImportItems: PromiseFromStreams['items'] = [];

    for (const item of data.items) {
      if (
        !(item instanceof Error) &&
        item.list_id === ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id &&
        item.tags?.includes(GLOBAL_ARTIFACT_TAG) === false
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

    return data;
  };
};
