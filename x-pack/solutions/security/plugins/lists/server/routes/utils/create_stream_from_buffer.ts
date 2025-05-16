/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

export const createStreamFromBuffer = (buffer: Buffer): Readable => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
};
