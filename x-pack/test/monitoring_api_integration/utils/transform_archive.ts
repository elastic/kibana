/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReadStream, createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { Transform } from 'stream';
import { createGzip } from 'zlib';
import { createPromiseFromStreams } from '@kbn/utils';

// eslint-disable-next-line @kbn/imports/uniform_imports
import { createParseArchiveStreams } from '../../../../packages/kbn-es-archiver/src/lib/archives/parse';

/**
 * generates .monitoring-* (metricbeat) archive from a metrics-* (package) archive
 * options:
 *   --src <archive-source> - eg /path/to/archive/data.json.gz
 */
(async () => {
  const opts = process.argv.slice(2);
  const sourceFile = opts[opts.findIndex((opt) => opt === '--src') + 1];
  if (!sourceFile) {
    throw new Error('missing required --src argument');
  }

  const targetDir = path
    .dirname(sourceFile)
    .split(path.sep)
    .slice(0, -1)
    .concat('metricbeat')
    .join(path.sep);
  const targetFile = path.join(targetDir, 'data.json.gz');

  // eslint-disable-next-line no-console
  console.info(`creating dir ${targetDir}`);
  await mkdir(targetDir, { recursive: true });

  await createPromiseFromStreams([
    createReadStream(sourceFile),
    ...createParseArchiveStreams({ gzip: true }),
    new Transform({
      objectMode: true,
      transform(item, _encoding, callback) {
        delete item.value.index;
        delete item.value.source.data_stream;
        delete item.value.source.elastic_agent;

        const source = item.value.source;

        const product = source.logstash
          ? 'logstash'
          : source.kibana
          ? 'kibana'
          : source.beat
          ? 'beats'
          : source.elasticsearch
          ? 'elasticsearch'
          : null;

        if (!product) {
          // eslint-disable-next-line no-console
          console.warn('could not detect source product of document:', source);
          return callback();
        }

        item.value.data_stream = `.monitoring-${product}-8-mb`;
        callback(null, JSON.stringify(item, null, 2) + '\n'.repeat(2));
      },
    }),
    createGzip(),
    createWriteStream(targetFile),
  ]);

  // eslint-disable-next-line no-console
  console.info(`created metricbeat data at ${targetFile}`);
})();
