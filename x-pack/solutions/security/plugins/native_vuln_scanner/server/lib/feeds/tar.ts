/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A streaming, selective tar reader for archives far larger than memory (Red Hat's CSAF
 * bulk archive is 8 GB uncompressed). It pulls from an async iterable, so backpressure is
 * the iteration itself, and it buffers only the entries the caller selects: every other
 * entry's bytes are discarded as they arrive. Supports ustar, pax (`x`) path/size
 * overrides and GNU long names (`L`); the `tar` package's parser cannot pause a source
 * and offers no way to refuse an entry before its bytes are read.
 */

const BLOCK = 512;

/** Pax and GNU long-name records are tiny; anything bigger is a corrupt or hostile archive. */
const MAX_METADATA_BYTES = 1024 * 1024;

export interface TarEntry {
  path: string;
  data: Buffer;
}

export interface ReadTarOptions {
  /** Called with each regular file's path and size; only entries it accepts are read into memory. */
  select: (path: string, size: number) => boolean;
  /** Called for every regular file, selected or not, as its header is read. */
  onEntry?: (path: string, size: number) => void;
}

const cString = (buf: Buffer, start: number, end: number): string => {
  const slice = buf.subarray(start, end);
  const nul = slice.indexOf(0);
  return slice.subarray(0, nul === -1 ? slice.length : nul).toString('utf8');
};

const parseSize = (header: Buffer): number => {
  // GNU base-256 for sizes that do not fit 11 octal digits. Nothing in this feed gets
  // near 8 GB per advisory; refuse rather than decode it wrong.
  if ((header[124] ?? 0) >= 0x80) {
    throw new Error('Corrupt tar archive: GNU base-256 entry sizes are unsupported');
  }
  const text = cString(header, 124, 136).trim();
  const value = text === '' ? 0 : parseInt(text, 8);
  if (!Number.isFinite(value) || value < 0) throw new Error('Corrupt tar archive: bad entry size');
  return value;
};

const headerChecksumValid = (header: Buffer): boolean => {
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) sum += i >= 148 && i < 156 ? 0x20 : header[i];
  const stored = parseInt(cString(header, 148, 156).trim(), 8);
  return stored === sum;
};

const parsePax = (data: Buffer): { path?: string; size?: number } => {
  const out: { path?: string; size?: number } = {};
  let offset = 0;
  while (offset < data.length) {
    const space = data.indexOf(0x20, offset);
    if (space === -1) break;
    const length = parseInt(data.subarray(offset, space).toString('utf8'), 10);
    if (!Number.isFinite(length) || length <= space - offset) break;
    const record = data.subarray(space + 1, offset + length - 1).toString('utf8');
    const eq = record.indexOf('=');
    if (eq !== -1) {
      const key = record.slice(0, eq);
      const value = record.slice(eq + 1);
      if (key === 'path') out.path = value;
      if (key === 'size') {
        const size = Number(value);
        if (!Number.isSafeInteger(size) || size < 0) {
          throw new Error('Corrupt tar archive: bad pax size');
        }
        out.size = size;
      }
    }
    offset += length;
  }
  return out;
};

/**
 * Yields the selected regular files of a tar stream. Throws on a truncated or corrupt
 * archive (checksum mismatch, EOF inside an entry).
 */
export async function* readTarEntries(
  source: AsyncIterable<Uint8Array>,
  { select, onEntry }: ReadTarOptions
): AsyncGenerator<TarEntry> {
  const iterator = source[Symbol.asyncIterator]();
  let pending: Buffer[] = [];
  let pendingLength = 0;
  let sourceDone = false;

  const pull = async (): Promise<boolean> => {
    if (sourceDone) return false;
    const { done, value } = await iterator.next();
    if (done) {
      sourceDone = true;
      return false;
    }
    if (value.byteLength > 0) {
      pending.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
      pendingLength += value.byteLength;
    }
    return true;
  };

  /** Returns exactly `n` bytes, or fewer only when the stream ended first. */
  const take = async (n: number): Promise<Buffer> => {
    while (pendingLength < n && (await pull())) {
      // keep pulling
    }
    const whole = pending.length === 1 ? pending[0] : Buffer.concat(pending, pendingLength);
    const got = Math.min(n, whole.length);
    pending = got < whole.length ? [whole.subarray(got)] : [];
    pendingLength = whole.length - got;
    return whole.subarray(0, got);
  };

  /** Drops `n` bytes without accumulating them. */
  const skip = async (n: number): Promise<void> => {
    let left = n;
    while (left > 0) {
      if (pendingLength === 0 && !(await pull())) throw new Error('Truncated tar archive');
      const chunk = pending[0];
      if (chunk.length <= left) {
        left -= chunk.length;
        pendingLength -= chunk.length;
        pending.shift();
      } else {
        pending[0] = chunk.subarray(left);
        pendingLength -= left;
        left = 0;
      }
    }
  };

  const padding = (size: number): number => (BLOCK - (size % BLOCK)) % BLOCK;

  let longName: string | undefined;
  let paxPath: string | undefined;
  let paxSize: number | undefined;

  try {
    for (;;) {
      const header = await take(BLOCK);
      if (header.length === 0) return;
      if (header.length < BLOCK) throw new Error('Truncated tar archive: partial header');
      if (header.every((b) => b === 0)) return;
      if (!headerChecksumValid(header)) throw new Error('Corrupt tar archive: bad header checksum');

      const type = String.fromCharCode(header[156] || 0x30);
      const declaredSize = parseSize(header);
      const size = type === '0' || type === '7' ? paxSize ?? declaredSize : declaredSize;

      if (type === 'x' || type === 'g' || type === 'L') {
        if (declaredSize > MAX_METADATA_BYTES) {
          throw new Error('Corrupt tar archive: oversized metadata record');
        }
        const data = await take(declaredSize);
        if (data.length < declaredSize) throw new Error('Truncated tar archive');
        await skip(padding(declaredSize));
        if (type === 'L') longName = cString(data, 0, data.length);
        if (type === 'x') {
          const pax = parsePax(data);
          paxPath = pax.path;
          paxSize = pax.size;
        }
        continue;
      }

      const prefix = cString(header, 345, 500);
      const name = cString(header, 0, 100);
      const path = paxPath ?? longName ?? (prefix ? `${prefix}/${name}` : name);
      longName = undefined;
      paxPath = undefined;
      paxSize = undefined;

      const isFile = type === '0' || type === '7';
      if (isFile && select(path, size)) {
        onEntry?.(path, size);
        const data = await take(size);
        if (data.length < size) throw new Error('Truncated tar archive');
        await skip(padding(size));
        yield { path, data };
      } else {
        if (isFile) onEntry?.(path, size);
        await skip(size + padding(size));
      }
    }
  } finally {
    await iterator.return?.();
  }
}
