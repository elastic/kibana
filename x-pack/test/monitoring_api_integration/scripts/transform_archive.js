/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../src/setup_node_env');

const { createReadStream, createWriteStream } = require('fs');
const { mkdir, rm } = require('fs/promises');
const path = require('path');
const { Transform } = require('stream');
const { createGzip } = require('zlib');
const { createPromiseFromStreams } = require('@kbn/utils');

const {
  createParseArchiveStreams,
} = require('../../../../packages/kbn-es-archiver/src/lib/archives/parse'); // eslint-disable-line @kbn/imports/uniform_imports

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

  const sourceDir = path.dirname(path.resolve(sourceFile));
  const targetDir = path.join(path.dirname(sourceDir), 'metricbeat');
  const targetFile = path.join(targetDir, 'data.json.gz');

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

        /* eslint-disable no-nested-ternary */
        const product = source.logstash
          ? 'logstash'
          : source.kibana
          ? 'kibana'
          : source.beat
          ? 'beats'
          : source.elasticsearch
          ? 'es'
          : null;
        /* eslint-enable no-nested-ternary */

        if (!product) {
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

  console.info(`created metricbeat data at ${targetFile}`);

  const mappingsFile = path.join(sourceDir, 'mappings.json');
  try {
    await rm(mappingsFile);
    console.info(`removed mappings at path ${mappingsFile}`);
  } catch (err) {
    if (err.code === 'ENOENT') return;
    console.warn(`failed to remove mappings at path ${mappingsFile}:`, err);
  }
})();
