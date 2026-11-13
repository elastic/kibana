/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { bunzip2Blocks } from './bzip2';

// `bzip2 -1` of 30000 "line N" rows (4 blocks), followed by a second stream "second stream\n".
const fixture = readFileSync(join(__dirname, '__fixtures__', 'lines_multistream.txt.bz2'));

const expected = (): string => {
  let s = '';
  for (let i = 0; i < 30000; i++) s += `line ${i}\n`;
  return `${s}second stream\n`;
};

describe('bunzip2Blocks', () => {
  it('decodes every block of every stream in order', () => {
    const blocks = [...bunzip2Blocks(fixture)];
    expect(blocks.length).toBeGreaterThan(2);
    expect(Buffer.concat(blocks).toString('utf8')).toBe(expected());
  });

  it('ignores trailing bytes after the last stream', () => {
    const padded = Buffer.concat([fixture, Buffer.alloc(16), Buffer.from('trailer')]);
    expect(Buffer.concat([...bunzip2Blocks(padded)]).toString('utf8')).toBe(expected());
  });

  it('rejects input without the bzip2 magic', () => {
    expect(() => [...bunzip2Blocks(Buffer.from('not bzip2 data'))]).toThrow();
  });

  it('rejects a corrupted block', () => {
    const corrupt = Buffer.from(fixture);
    corrupt[200] = 255 - corrupt[200];
    expect(() => [...bunzip2Blocks(corrupt)]).toThrow();
  });
});
