/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Bunzip from 'seek-bzip';

const CHUNK_SIZE = 64 * 1024;

// seek-bzip keeps CRCs as signed 32-bit ints; compare them as unsigned.
const toUint32 = (n: number): number => (n < 0 ? n + 2 ** 32 : n);

/**
 * Decompresses a (possibly multi-stream) bzip2 buffer one block at a time, so callers can yield
 * to the event loop between blocks instead of blocking it for the whole feed. Block and stream
 * CRCs are verified; corrupt input throws.
 */
export function* bunzip2Blocks(input: Uint8Array): Generator<Buffer> {
  let pos = 0;
  const inputStream = {
    readByte: (): number => (pos < input.length ? input[pos++] : -1),
    read: (buffer: Uint8Array, offset: number, length: number): number => {
      const n = Math.min(length, input.length - pos);
      buffer.set(input.subarray(pos, pos + n), offset);
      pos += n;
      return n;
    },
    eof: (): boolean => pos >= input.length,
  };

  const done: Buffer[] = [];
  let current = Buffer.allocUnsafe(CHUNK_SIZE);
  let written = 0;
  const outputStream = {
    writeByte: (byte: number): void => {
      current[written++] = byte;
      if (written === CHUNK_SIZE) {
        done.push(current);
        current = Buffer.allocUnsafe(CHUNK_SIZE);
        written = 0;
      }
    },
  };
  const flush = (): Buffer | undefined => {
    if (written > 0) {
      done.push(Buffer.from(current.subarray(0, written)));
      written = 0;
    }
    if (done.length === 0) return undefined;
    const out = done.length === 1 ? done[0] : Buffer.concat(done);
    done.length = 0;
    return out;
  };

  const bunzip = new Bunzip(inputStream, outputStream);
  while (true) {
    if (bunzip._init_block()) {
      bunzip._read_bunzip();
      const block = flush();
      if (block) yield block;
      continue;
    }
    const expected = toUint32(bunzip.reader.read(32));
    const actual = toUint32(bunzip.streamCRC);
    if (expected !== actual) {
      throw new Error(
        `bzip2 stream CRC mismatch (got ${actual.toString(16)}, expected ${expected.toString(16)})`
      );
    }
    // Streams are byte-aligned; skip the end-of-stream padding and continue with the next one.
    if (inputStream.eof()) return;
    bunzip._start_bunzip(inputStream, outputStream);
  }
}
