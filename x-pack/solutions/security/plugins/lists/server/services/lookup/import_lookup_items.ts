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
 */
export const importLookupItemsToStream = ({
  config,
  esClient,
  index,
  stream,
  type,
}: {
  config: ConfigType;
  esClient: ElasticsearchClient;
  index: string;
  stream: Readable;
  type: Type;
}): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const readBuffer = new BufferLines({ bufferSize: config.importBufferSize, input: stream });
    const values: string[] = [];

    readBuffer.on('lines', (lines: string[]) => {
      for (const line of lines) {
        if (line != null && line.trim() !== '') values.push(line);
      }
    });

    readBuffer.on('error', (err: Error) => reject(err));

    readBuffer.on('close', async () => {
      try {
        await writeLookupItems({ esClient, index, type, values });
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
};
