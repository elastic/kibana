/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type {
  DescriptionOrUndefined,
  Id,
  ListSchema,
  MetaOrUndefined,
  NameOrUndefined,
  _VersionOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';
import { VersionOrUndefined } from '@kbn/securitysolution-io-ts-types';

import { UpdateEsListSchema } from '../../schemas/elastic_query';
import { checkVersionConflict, waitUntilDocumentIndexed } from '../utils';

import { getList } from '.';

export interface UpdateListOptions {
  _version: _VersionOrUndefined;
  id: Id;
  esClient: ElasticsearchClient;
  listIndex: string;
  user: string;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  meta: MetaOrUndefined;
  dateNow?: string;
  version: VersionOrUndefined;
  isPatch?: boolean;
}

export const updateList = async ({
  _version,
  id,
  name,
  description,
  esClient,
  listIndex,
  user,
  meta,
  dateNow,
  version,
  isPatch = false,
}: UpdateListOptions): Promise<ListSchema | null> => {
  const updatedAt = dateNow ?? new Date().toISOString();
  const list = await getList({ esClient, id, listIndex });
  if (list == null) {
    return null;
  } else {
    checkVersionConflict(_version, list._version);
    const calculatedVersion = version == null ? list.version + 1 : version;

    const params: UpdateEsListSchema = {
      description,
      meta,
      name,
      updated_at: updatedAt,
      updated_by: user,
      version: calculatedVersion,
    };

    const response = await esClient.updateByQuery({
      conflicts: 'proceed',
      index: listIndex,
      query: {
        ids: {
          values: [id],
        },
      },
      refresh: false,
      script: {
        lang: 'painless',
        params: {
          ...params,
          // when assigning undefined in painless, it will remove property and wil set it to null
          // for patch we don't want to remove unspecified value in payload
          assignEmpty: !isPatch,
        },
        source: `
          if (params.assignEmpty == true || params.containsKey('description')) {
            ctx._source.description = params.description;
          }
          if (params.assignEmpty == true || params.containsKey('meta')) {
            ctx._source.meta = params.meta;
          }
          if (params.assignEmpty == true || params.containsKey('name')) {
            ctx._source.name = params.name;
          }
          if (params.assignEmpty == true || params.containsKey('version')) {
            ctx._source.version = params.version;
          }
          ctx._source.updated_at = params.updated_at;
          ctx._source.updated_by = params.updated_by;
          // needed for list that were created before migration to data streams
          if (ctx._source.containsKey('@timestamp') == false) {
            ctx._source['@timestamp'] = ctx._source.created_at;
          }
        `,
      },
    });

    let updatedOCCVersion: string | undefined;
    if (response.updated) {
      const checkIfListUpdated = async (): Promise<void> => {
        const updatedList = await getList({ esClient, id, listIndex });
        if (updatedList?._version === list._version) {
          throw Error('Document has not been re-indexed in time');
        }
        updatedOCCVersion = updatedList?._version;
      };

      await waitUntilDocumentIndexed(checkIfListUpdated);
    } else {
      throw Error('No list has been updated');
    }

    return {
      '@timestamp': list['@timestamp'],
      _version: updatedOCCVersion,
      created_at: list.created_at,
      created_by: list.created_by,
      description: description ?? list.description,
      deserializer: list.deserializer,
      id,
      immutable: list.immutable,
      meta: isPatch ? meta ?? list.meta : meta,
      name: name ?? list.name,
      serializer: list.serializer,
      tie_breaker_id: list.tie_breaker_id,
      type: list.type,
      updated_at: updatedAt,
      updated_by: user,
      version: calculatedVersion,
    };
  }
};
