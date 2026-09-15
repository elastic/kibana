/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';

import type { ConfigType } from '../../config';
import { BufferLines } from '../items/buffer_lines';

import { writeLookupItems } from './write_lookup_items';

/**
 * Imports a newline-delimited value file into a per-list lookup index. Collects
 * the authored values from the stream, then writes them once (dedup for equality,
 * source + coalesced rebuild for ranges).
 *
 * The target is either a known access name (`index`), or resolved from the uploaded
 * file name (`resolveIndex`), which is the path the import route takes when no
 * `list_id` is given: the list is created, or found, under the file name. The file
 * name arrives on the stream before the first line, so the resolver runs before any
 * value is written.
 */
export const importLookupItemsToStream = ({
  config,
  esClient,
  index,
  resolveIndex,
  stream,
  type,
}: {
  config: ConfigType;
  esClient: ElasticsearchClient;
  index?: string;
  resolveIndex?: (fileName: string) => Promise<string>;
  stream: Readable;
  type: Type;
}): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const readBuffer = new BufferLines({ bufferSize: config.importBufferSize, input: stream });
    const values: string[] = [];
    let targetPromise: Promise<string> | undefined =
      index != null ? Promise.resolve(index) : undefined;

    readBuffer.on('fileName', (fileNameEmitted: string) => {
      if (targetPromise != null || resolveIndex == null) return;
      readBuffer.pause();
      targetPromise = resolveIndex(decodeURIComponent(fileNameEmitted));
      targetPromise.then(() => readBuffer.resume(), reject);
    });

    readBuffer.on('lines', (lines: string[]) => {
      for (const line of lines) {
        if (line != null && line.trim() !== '') values.push(line);
      }
    });

    readBuffer.on('error', (err: Error) => reject(err));

    readBuffer.on('close', async () => {
      try {
        if (targetPromise == null) {
          throw new Error(
            'import has no target list: no list_id was given and no file name was found'
          );
        }
        const target = await targetPromise;
        await writeLookupItems({ esClient, index: target, type, values });
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
};
