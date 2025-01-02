/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import {
  ENDPOINT_LIST_DESCRIPTION,
  ENDPOINT_LIST_ID,
  ENDPOINT_LIST_NAME,
  EXCEPTION_LIST_ITEM_URL,
  INTERNAL_EXCEPTIONS_LIST_ENSURE_CREATED_URL,
} from '@kbn/securitysolution-list-constants';
import type { KbnClient } from '@kbn/test';
import type {
  CreateExceptionListSchema,
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { memoize } from 'lodash';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { catchAxiosErrorFormatAndThrow } from '../../../common/endpoint/format_axios_error';
import { TRUSTED_APPS_EXCEPTION_LIST_DEFINITION } from '../../../public/management/pages/trusted_apps/constants';
import { EVENT_FILTER_LIST_DEFINITION } from '../../../public/management/pages/event_filters/constants';
import { BLOCKLISTS_LIST_DEFINITION } from '../../../public/management/pages/blocklist/constants';
import { HOST_ISOLATION_EXCEPTIONS_LIST_DEFINITION } from '../../../public/management/pages/host_isolation_exceptions/constants';
import type { NewTrustedApp } from '../../../common/endpoint/types';
import { newTrustedAppToCreateExceptionListItem } from '../../../public/management/pages/trusted_apps/service/mappers';

const ensureArtifactListExists = memoize(
  async (
    kbnClient: KbnClient,
    artifactType: keyof typeof ENDPOINT_ARTIFACT_LISTS | 'endpointExceptions'
  ) => {
    let listDefinition: CreateExceptionListSchema;

    switch (artifactType) {
      case 'blocklists':
        listDefinition = BLOCKLISTS_LIST_DEFINITION;
        break;

      case 'eventFilters':
        listDefinition = EVENT_FILTER_LIST_DEFINITION;
        break;

      case 'hostIsolationExceptions':
        listDefinition = HOST_ISOLATION_EXCEPTIONS_LIST_DEFINITION;
        break;

      case 'trustedApps':
        listDefinition = TRUSTED_APPS_EXCEPTION_LIST_DEFINITION;
        break;

      case 'endpointExceptions':
        listDefinition = {
          name: ENDPOINT_LIST_NAME,
          namespace_type: 'agnostic',
          description: ENDPOINT_LIST_DESCRIPTION,
          list_id: ENDPOINT_LIST_ID,
          type: ExceptionListTypeEnum.ENDPOINT,
        };

      default:
        throw new Error(`Unknown Artifact list: ${artifactType}`);
    }

    await kbnClient
      .request({
        method: 'POST',
        path: INTERNAL_EXCEPTIONS_LIST_ENSURE_CREATED_URL,
        body: listDefinition,
        headers: {
          'elastic-api-version': '1',
        },
      })
      .catch(catchAxiosErrorFormatAndThrow);
  },
  (kbnClient: KbnClient, artifactType: string) => {
    return `${artifactType}@[${kbnClient.resolveUrl('')}`;
  }
);

/**
 * Creates an exception list item.
 * NOTE: this method does NOT create the list itself.
 *
 * @private
 *
 * @param kbnClient
 * @param data
 */
const createExceptionListItem = async (
  kbnClient: KbnClient,
  data: CreateExceptionListItemSchema
): Promise<ExceptionListItemSchema> => {
  return kbnClient
    .request<ExceptionListItemSchema>({
      method: 'POST',
      path: EXCEPTION_LIST_ITEM_URL,
      body: data,
      headers: {
        'elastic-api-version': '2023-10-31',
      },
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .then((response) => response.data);
};

export const createTrustedApp = async (
  kbnClient: KbnClient,
  data: NewTrustedApp
): Promise<ExceptionListItemSchema> => {
  await ensureArtifactListExists(kbnClient, 'trustedApps');
  return createExceptionListItem(kbnClient, newTrustedAppToCreateExceptionListItem(data));
};

export const createEventFilter = async (
  kbnClient: KbnClient,
  data: CreateExceptionListItemSchema
): Promise<ExceptionListItemSchema> => {
  await ensureArtifactListExists(kbnClient, 'eventFilters');
  return createExceptionListItem(kbnClient, data);
};

export const createBlocklist = async (
  kbnClient: KbnClient,
  data: CreateExceptionListItemSchema
): Promise<ExceptionListItemSchema> => {
  await ensureArtifactListExists(kbnClient, 'blocklists');
  return createExceptionListItem(kbnClient, data);
};

export const createHostIsolationException = async (
  kbnClient: KbnClient,
  data: CreateExceptionListItemSchema
): Promise<ExceptionListItemSchema> => {
  await ensureArtifactListExists(kbnClient, 'hostIsolationExceptions');
  return createExceptionListItem(kbnClient, data);
};

export const createEndpointException = async (
  kbnClient: KbnClient,
  data: CreateExceptionListItemSchema
): Promise<ExceptionListItemSchema> => {
  await ensureArtifactListExists(kbnClient, 'hostIsolationExceptions');
  return createExceptionListItem(kbnClient, data);
};
