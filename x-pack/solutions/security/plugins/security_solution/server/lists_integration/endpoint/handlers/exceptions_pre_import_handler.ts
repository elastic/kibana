/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionsListPreImportServerExtension } from '@kbn/lists-plugin/server';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { EndpointArtifactExceptionValidationError } from '../validators/errors';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../../common/endpoint/service/artifacts/constants';

export const getExceptionsPreImportHandler =
  (): ExceptionsListPreImportServerExtension['callback'] => {
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

      return data;
    };
  };
