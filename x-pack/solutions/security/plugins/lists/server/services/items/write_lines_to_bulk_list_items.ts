/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  ListIdOrUndefined,
  ListSchema,
  MetaOrUndefined,
  RefreshWithWaitFor,
  Type,
} from '@kbn/securitysolution-io-ts-list-types';
import type { Version } from '@kbn/securitysolution-io-ts-types';
import { i18n } from '@kbn/i18n';

import { createListIfItDoesNotExist } from '../lists/create_list_if_it_does_not_exist';
import type { ConfigType } from '../../config';

import { BufferLines } from './buffer_lines';
import { createListItemsBulk } from './create_list_items_bulk';

export interface ImportListItemsToStreamOptions {
  listId: ListIdOrUndefined;
  config: ConfigType;
  listIndex: string;
  stream: Readable;
  esClient: ElasticsearchClient;
  listItemIndex: string;
  type: Type;
  user: string;
  meta: MetaOrUndefined;
  version: Version;
  refresh?: RefreshWithWaitFor;
}

export const importListItemsToStream = ({
  config,
  listId,
  stream,
  esClient,
  listItemIndex,
  listIndex,
  type,
  user,
  meta,
  version,
  refresh,
}: ImportListItemsToStreamOptions): Promise<ListSchema | null> => {
  return new Promise<ListSchema | null>((resolve, reject) => {
    const readBuffer = new BufferLines({ bufferSize: config.importBufferSize, input: stream });
    let fileName: string | undefined;
    let list: ListSchema | null = null;
    readBuffer.on('fileName', async (fileNameEmitted: string) => {
      try {
        readBuffer.pause();
        fileName = decodeURIComponent(fileNameEmitted);
        if (listId == null) {
          list = await createListIfItDoesNotExist({
            description: i18n.translate('xpack.lists.services.items.fileUploadFromFileSystem', {
              defaultMessage: 'File uploaded from file system of {fileName}',
              values: { fileName },
            }),
            esClient,
            id: fileName,
            immutable: false,
            listIndex,
            meta,
            name: fileName,
            type,
            user,
            version,
          });
        }
        readBuffer.resume();
      } catch (err) {
        reject(err);
      }
    });

    readBuffer.on('lines', async (lines: string[]) => {
      try {
        if (listId != null) {
          await writeBufferToItems({
            buffer: lines,
            esClient,
            listId,
            listItemIndex,
            meta,
            refresh,
            type,
            user,
          });
        } else if (fileName != null) {
          await writeBufferToItems({
            buffer: lines,
            esClient,
            listId: fileName,
            listItemIndex,
            meta,
            refresh,
            type,
            user,
          });
        }
      } catch (err) {
        reject(err);
      }
    });

    readBuffer.on('close', () => {
      resolve(list);
    });
  });
};

export interface WriteBufferToItemsOptions {
  listId: string;
  esClient: ElasticsearchClient;
  listItemIndex: string;
  buffer: string[];
  type: Type;
  user: string;
  meta: MetaOrUndefined;
  refresh?: RefreshWithWaitFor;
}

export interface LinesResult {
  linesProcessed: number;
}

export const writeBufferToItems = async ({
  listId,
  esClient,
  listItemIndex,
  buffer,
  type,
  user,
  meta,
  refresh,
}: WriteBufferToItemsOptions): Promise<LinesResult> => {
  await createListItemsBulk({
    esClient,
    listId,
    listItemIndex,
    meta,
    refresh,
    type,
    user,
    value: buffer,
  });
  return { linesProcessed: buffer.length };
};
