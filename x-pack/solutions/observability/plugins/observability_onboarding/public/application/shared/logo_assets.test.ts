/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const readSvg = (asset: string): Document =>
  new DOMParser().parseFromString(
    readFileSync(resolve(__dirname, '../../assets', asset), 'utf8'),
    'image/svg+xml'
  );

describe('Vercel logo assets', () => {
  it.each([
    ['vercel_black.svg', 'black'],
    ['vercel_white.svg', 'white'],
  ])('uses the official standalone triangle in %s', (asset, fill) => {
    const svg = readSvg(asset);
    const path = svg.querySelector('path');

    expect(svg.querySelector('parsererror')).toBeNull();
    expect(svg.querySelector('circle')).toBeNull();
    expect(path?.getAttribute('d')).toBe('M8 1L16 15H0L8 1Z');
    expect(path?.getAttribute('fill')).toBe(fill);
  });
});
