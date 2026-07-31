/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Vercel logo assets', () => {
  it.each([
    ['vercel_black.svg', 'black'],
    ['vercel_white.svg', 'white'],
  ])('uses the official standalone triangle in %s', (asset, fill) => {
    const svg = readFileSync(resolve(__dirname, '../../assets', asset), 'utf8');

    expect(svg).not.toContain('<circle');
    expect(svg).toContain(`<path d="M8 1L16 15H0L8 1Z" fill="${fill}"/>`);
  });
});
