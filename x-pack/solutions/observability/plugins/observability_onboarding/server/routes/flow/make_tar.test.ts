/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { makeTar, type Entry } from './make_tar';
import * as tar from 'tar';
import expect from 'expect';

describe('makeTar', () => {
  it('creates a valid tar archive that can be extracted', () => {
    const archive = makeTar([
      {
        type: 'Directory',
        path: 'inputs.d/',
        mode: 0o755,
      },
      {
        type: 'File',
        path: 'inputs.d/system.yml',
        mode: 0o644,
        data: 's'.repeat(512),
      },
      {
        type: 'File',
        path: 'inputs.d/redis.yml',
        mode: 0o644,
        data: 'r'.repeat(1024),
      },
    ]);

    const extracted: Entry[] = [];
    tar
      .extract({
        sync: true,
        onReadEntry: (readEntry) => {
          const entry: Entry = readEntry;
          readEntry.on('data', (buffer) => {
            if (!entry.data) {
              entry.data = '';
            }
            entry.data += buffer.toString();
          });
          extracted.push(entry);
        },
      })
      .write(archive);

    expect(extracted).toEqual([
      expect.objectContaining({
        type: 'Directory',
        path: 'inputs.d/',
        mode: 0o755,
      }),
      expect.objectContaining({
        type: 'File',
        path: 'inputs.d/system.yml',
        mode: 0o644,
        data: 's'.repeat(512),
      }),
      expect.objectContaining({
        type: 'File',
        path: 'inputs.d/redis.yml',
        mode: 0o644,
        data: 'r'.repeat(1024),
      }),
    ]);
  });
});
