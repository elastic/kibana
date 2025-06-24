/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { LIST_INDEX } from '@kbn/securitysolution-list-constants';
import { DeleteListIndexResponse } from '@kbn/securitysolution-lists-common/api';

import { ListClient } from '../../services/lists/list_client';
import type { ListsPluginRouter } from '../../types';
import { buildSiemResponse } from '../utils';
import { getListClient } from '..';

/**
 * Deletes all of the indexes, template, ilm policies, and aliases. You can check
 * this by looking at each of these settings from ES after a deletion:
 *
 * GET /_template/.lists-default
 * GET /.lists-default-000001/
 * GET /_ilm/policy/.lists-default
 * GET /_alias/.lists-default
 *
 * GET /_template/.items-default
 * GET /.items-default-000001/
 * GET /_ilm/policy/.items-default
 * GET /_alias/.items-default
 *
 * And ensuring they're all gone
 */
export const deleteListIndexRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .delete({
      access: 'public',
      path: LIST_INDEX,
      security: {
        authz: {
          requiredPrivileges: ['lists-all'],
        },
      },
    })
    .addVersion(
      {
        validate: false,
        version: '2023-10-31',
      },
      async (context, _, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const lists = await getListClient(context);
          const listIndexExists = await lists.getListIndexExists();
          const listItemIndexExists = await lists.getListItemIndexExists();

          const listDataStreamExists = await lists.getListDataStreamExists();
          const listItemDataStreamExists = await lists.getListItemDataStreamExists();

          // return early if no data stream or indices exist
          if (
            !listDataStreamExists &&
            !listItemDataStreamExists &&
            !listIndexExists &&
            !listItemIndexExists
          ) {
            return siemResponse.error({
              body: `index and data stream: "${lists.getListName()}" and "${lists.getListItemName()}" does not exist`,
              statusCode: 404,
            });
          }

          // ensure data streams deleted if exist
          await deleteDataStreams(lists, listDataStreamExists, listItemDataStreamExists);

          // we need to call this section only if any of these indices exist
          // to delete indices, ILM policies and legacy templates
          // ILM policies and legacy templates do not exist on serverless,
          // so by checking if any of index exists we ensure it is stateful
          if (listIndexExists || listItemIndexExists) {
            await deleteIndices(lists, listIndexExists, listItemIndexExists);
            await lists.deleteLegacyListTemplateIfExists();
            await lists.deleteLegacyListItemTemplateIfExists();
          }

          await deleteIndexTemplates(lists);

          return response.ok({ body: DeleteListIndexResponse.parse({ acknowledged: true }) });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};

/**
 * Delete list/item indices
 */
const deleteIndices = async (
  lists: ListClient,
  listIndexExists: boolean,
  listItemIndexExists: boolean
): Promise<void> => {
  if (listIndexExists) {
    await lists.deleteListIndex();
  }
  if (listItemIndexExists) {
    await lists.deleteListItemIndex();
  }

  const listsPolicyExists = await lists.getListPolicyExists();
  const listItemPolicyExists = await lists.getListItemPolicyExists();

  if (listsPolicyExists) {
    await lists.deleteListPolicy();
  }
  if (listItemPolicyExists) {
    await lists.deleteListItemPolicy();
  }
};

/**
 * Delete list/item data streams
 */
const deleteDataStreams = async (
  lists: ListClient,
  listDataStreamExists: boolean,
  listItemDataStreamExists: boolean
): Promise<void> => {
  if (listDataStreamExists) {
    await lists.deleteListDataStream();
  }
  if (listItemDataStreamExists) {
    await lists.deleteListItemDataStream();
  }
};

/**
 * Delete list/item index templates
 */
const deleteIndexTemplates = async (lists: ListClient): Promise<void> => {
  const listsTemplateExists = await lists.getListTemplateExists();
  const listItemTemplateExists = await lists.getListItemTemplateExists();

  if (listsTemplateExists) {
    await lists.deleteListTemplate();
  }
  if (listItemTemplateExists) {
    await lists.deleteListItemTemplate();
  }
};
