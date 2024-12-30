/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Header, type HeaderData } from 'tar';

const BLOCK_SIZE = 512; // https://www.gnu.org/software/tar/manual/html_node/Standard.html

export interface Entry extends Omit<HeaderData, 'size'> {
  data?: string;
}

/**
 * Creates a tar archive from a list of entries in memory.
 *
 * Ensure you set the appropriate permissions (`0o755` for directories and `0o644` for files) or the
 * extracted files won't be readable.
 *
 * Example:
 *
 * ```ts
 * const now = new Date();
 * const archive = makeTar([
 *   {
 *     type: 'Directory',
 *     path: 'inputs.d/',
 *     mode: 0o755,
 *     mtime: now,
 *   },
 *   {
 *     type: 'File',
 *     path: 'inputs.d/redis.yml',
 *     mode: 0o644,
 *     mtime: now,
 *     data: 'inputs:\n- type: logs',
 *   },
 * ]
 * ```
 */
export function makeTar(entries: Entry[]) {
  // A tar archive contains a series of blocks. Each block contains 512 bytes. Each file archived is
  // represented by a header block which describes the file, followed by zero or more blocks which
  // give the contents of the file.
  const blocks = entries.map((entry) => {
    const size = typeof entry.data === 'string' ? entry.data.length : 0;
    const buffer = Buffer.alloc(BLOCK_SIZE * (Math.ceil(size / BLOCK_SIZE) + 1));

    // Write header into first block
    const header = new Header({ ...entry, size });
    header.encode(buffer, 0);

    // Write data into subsequent blocks
    if (typeof entry.data === 'string') {
      buffer.write(entry.data, BLOCK_SIZE);
    }

    return buffer;
  });

  // At the end of the archive file there are two 512-byte blocks filled with binary zeros as an
  // end-of-file marker.
  const eof = Buffer.alloc(2 * BLOCK_SIZE);
  blocks.push(eof);

  return Buffer.concat(blocks);
}
