/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_MANIFEST_BYTES, parseManifest } from './manifest';

const COMMUNITY_MANIFEST = `
categories:
  - security
conditions:
  kibana:
    version: ^9.6.0
description: Detection rules contributed by the Elastic community
format_version: 3.0.0
icons:
  - size: 32x32
    src: /elastic-logo-color.svg
    type: image/svg+xml
name: elastic_community_rules
owner:
  github: sdesalas
  type: community
source:
  license: Elastic-2.0
title: Elastic Community Rules
type: integration
version: 0.0.1
`;

describe('parseManifest', () => {
  it('reads the fields a library needs from an integration manifest', () => {
    expect(parseManifest(Buffer.from(COMMUNITY_MANIFEST))).toEqual({
      name: 'elastic_community_rules',
      title: 'Elastic Community Rules',
      description: 'Detection rules contributed by the Elastic community',
      version: '0.0.1',
      license: 'Elastic-2.0',
      owner: { github: 'sdesalas', type: 'community' },
      images: [{ src: '/elastic-logo-color.svg', size: '32x32', type: 'image/svg+xml' }],
    });
  });

  it('ignores fields it does not use and leaves out the ones that are missing', () => {
    expect(parseManifest(Buffer.from('title: Only a title\ncategories: [security]\n'))).toEqual({
      title: 'Only a title',
    });
  });

  it('reads a numeric version as text', () => {
    expect(parseManifest(Buffer.from('version: 2\n')).version).toBe('2');
  });

  it('rejects a manifest that is larger than the limit without parsing it', () => {
    expect(() => parseManifest(Buffer.alloc(MAX_MANIFEST_BYTES + 1, 'a'))).toThrow('larger than');
  });

  it('rejects text that is not YAML', () => {
    expect(() => parseManifest(Buffer.from('title: [unterminated'))).toThrow('not valid YAML');
  });

  it('rejects a document that is not a mapping', () => {
    expect(() => parseManifest(Buffer.from('- a\n- b\n'))).toThrow('not a YAML mapping');
    expect(() => parseManifest(Buffer.from('just text'))).toThrow('not a YAML mapping');
  });

  it('cuts overlong values and caps the number of icons', () => {
    const icons = Array.from({ length: 50 }, (_, i) => `  - src: /icon-${i}.svg`).join('\n');
    const manifest = parseManifest(Buffer.from(`title: ${'a'.repeat(1000)}\nicons:\n${icons}\n`));

    expect(manifest.title).toHaveLength(256);
    expect(manifest.images).toHaveLength(10);
  });

  it('drops icons that have no source and values of the wrong type', () => {
    const manifest = parseManifest(
      Buffer.from('title: [a, b]\nowner: nope\nicons:\n  - size: 32x32\n  - src: /ok.svg\n')
    );

    expect(manifest.title).toBeUndefined();
    expect(manifest.owner).toBeUndefined();
    expect(manifest.images).toEqual([{ src: '/ok.svg' }]);
  });

  it('refuses a document that expands through many aliases', () => {
    const lines = ['a: &a [x, x, x, x, x, x, x, x, x, x]'];
    for (let i = 0; i < 30; i++) lines.push(`b${i}: *a`);

    expect(() => parseManifest(Buffer.from(lines.join('\n')))).toThrow('not valid YAML');
  });
});
