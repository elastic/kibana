/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// seek-bzip ships no types. Only the block-level internals used by ./bzip2.ts are declared.
declare module 'seek-bzip' {
  interface BunzipInputStream {
    readByte(): number;
    read(buffer: Uint8Array, offset: number, length: number): number;
    eof(): boolean;
  }

  interface BunzipOutputStream {
    writeByte(byte: number): void;
  }

  class Bunzip {
    constructor(input: BunzipInputStream, output: BunzipOutputStream);
    reader: { read(bits: number): number };
    streamCRC: number;
    _init_block(): boolean;
    _read_bunzip(): number;
    _start_bunzip(input: BunzipInputStream, output: BunzipOutputStream): void;
  }

  export = Bunzip;
}
