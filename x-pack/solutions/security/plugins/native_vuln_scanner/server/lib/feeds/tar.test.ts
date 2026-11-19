/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readTarEntries } from './tar';
import type { TarEntry } from './tar';

const BLOCK = 512;

const header = (
  path: string,
  size: number,
  type = '0',
  { rawSize }: { rawSize?: Buffer } = {}
): Buffer => {
  const buf = Buffer.alloc(BLOCK);
  buf.write(path, 0, 'utf8');
  buf.write('0000644\0', 100);
  buf.write('0000000\0', 108);
  buf.write('0000000\0', 116);
  if (rawSize) rawSize.copy(buf, 124);
  else buf.write(`${size.toString(8).padStart(11, '0')}\0`, 124);
  buf.write('00000000000\0', 136);
  buf.write(type, 156);
  buf.write('ustar\0', 257);
  buf.write('00', 263);
  buf.fill(0x20, 148, 156);
  let sum = 0;
  for (const b of buf) sum += b;
  buf.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
  return buf;
};

const body = (data: Buffer): Buffer =>
  Buffer.concat([data, Buffer.alloc((BLOCK - (data.length % BLOCK)) % BLOCK)]);

const file = (path: string, data: string, type = '0'): Buffer =>
  Buffer.concat([header(path, data.length, type), body(Buffer.from(data))]);

const paxRecord = (key: string, value: string): string => {
  const rest = ` ${key}=${value}\n`;
  let length = rest.length + 1;
  while (`${length}${rest}`.length !== length) length = `${length}${rest}`.length;
  return `${length}${rest}`;
};

const end = Buffer.alloc(BLOCK * 2);

const read = async (
  archive: Buffer,
  select: (path: string, size: number) => boolean = () => true,
  chunkSize = archive.length
): Promise<TarEntry[]> => {
  async function* chunks(): AsyncGenerator<Uint8Array> {
    for (let i = 0; i < archive.length; i += chunkSize) {
      yield archive.subarray(i, i + chunkSize);
    }
  }
  const out: TarEntry[] = [];
  for await (const entry of readTarEntries(chunks(), { select })) {
    out.push(entry);
  }
  return out;
};

describe('readTarEntries', () => {
  it('yields selected regular files regardless of chunking', async () => {
    const archive = Buffer.concat([file('a.json', '{"a":1}'), file('b.json', '{"b":2}'), end]);
    for (const chunkSize of [archive.length, 513, 7]) {
      const entries = await read(archive, (path) => path === 'b.json', chunkSize);
      expect(entries.map((e) => [e.path, e.data.toString()])).toEqual([['b.json', '{"b":2}']]);
    }
  });

  it('skips directory entries without yielding or selecting them', async () => {
    const select = jest.fn(() => true);
    const archive = Buffer.concat([header('2026/', 0, '5'), file('2026/a.json', 'x'), end]);
    const entries = await read(archive, select);
    expect(entries.map((e) => e.path)).toEqual(['2026/a.json']);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('throws on a truncated header', async () => {
    const archive = Buffer.concat([file('a.json', 'x'), Buffer.alloc(100, 1)]);
    await expect(read(archive)).rejects.toThrow('partial header');
  });

  it('throws on a truncated entry body', async () => {
    const archive = Buffer.concat([header('a.json', 2000), Buffer.alloc(100, 1)]);
    await expect(read(archive)).rejects.toThrow('Truncated tar archive');
  });

  it('throws on a bad header checksum', async () => {
    const bad = file('a.json', 'x');
    bad.write('0000001\0', 148);
    await expect(read(Buffer.concat([bad, end]))).rejects.toThrow('bad header checksum');
  });

  it('applies a pax size override to the next entry only', async () => {
    const real = 'abcdefghij';
    // The ustar header claims 1 byte; the pax record says the real size is 10.
    const archive = Buffer.concat([
      file('pax', paxRecord('size', String(real.length)), 'x'),
      header('big.json', 1),
      body(Buffer.from(real)),
      file('next.json', 'zz'),
      end,
    ]);
    const entries = await read(archive);
    expect(entries.map((e) => [e.path, e.data.toString()])).toEqual([
      ['big.json', real],
      ['next.json', 'zz'],
    ]);
  });

  it('uses a pax path record for the next entry only', async () => {
    const archive = Buffer.concat([
      file('pax', paxRecord('path', 'long/dir/pax-named.json'), 'x'),
      file('short', 'one'),
      file('plain.json', 'two'),
      end,
    ]);
    const entries = await read(archive);
    expect(entries.map((e) => [e.path, e.data.toString()])).toEqual([
      ['long/dir/pax-named.json', 'one'],
      ['plain.json', 'two'],
    ]);
  });

  it('uses a GNU long name (L) for the next entry only', async () => {
    const longName = `${'d/'.repeat(80)}long.json`;
    const archive = Buffer.concat([
      file('././@LongLink', `${longName}\0`, 'L'),
      file('truncated-name', 'one'),
      file('plain.json', 'two'),
      end,
    ]);
    const entries = await read(archive);
    expect(entries.map((e) => [e.path, e.data.toString()])).toEqual([
      [longName, 'one'],
      ['plain.json', 'two'],
    ]);
  });

  it('joins the ustar prefix and name', async () => {
    const withPrefix = file('name.json', 'x');
    withPrefix.write('some/prefix', 345);
    withPrefix.fill(0x20, 148, 156);
    let sum = 0;
    for (let i = 0; i < BLOCK; i++) sum += withPrefix[i];
    withPrefix.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
    const entries = await read(Buffer.concat([withPrefix, end]));
    expect(entries.map((e) => e.path)).toEqual(['some/prefix/name.json']);
  });

  it.each(['-5', 'abc', '1.5', '99999999999999999999'])(
    'rejects an invalid pax size %p',
    async (value) => {
      const archive = Buffer.concat([
        file('pax', paxRecord('size', value), 'x'),
        file('a.json', 'x'),
        end,
      ]);
      await expect(read(archive)).rejects.toThrow('bad pax size');
    }
  );

  it('refuses GNU base-256 entry sizes instead of misreading them', async () => {
    const raw = Buffer.alloc(12);
    raw[0] = 0x80;
    raw[11] = 5;
    const archive = Buffer.concat([header('a.json', 0, '0', { rawSize: raw }), end]);
    await expect(read(archive)).rejects.toThrow('base-256');
  });
});
