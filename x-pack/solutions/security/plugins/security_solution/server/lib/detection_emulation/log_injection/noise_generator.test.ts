/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateNoise } from './noise_generator';

describe('NoiseGenerator', () => {
  const baseOptions = {
    count: 10,
    baseTimestamp: '2024-01-01T12:00:00.000Z',
    hostId: 'host-1',
    hostName: 'DESKTOP-TEST',
    os: 'windows' as const,
  };

  it('generates the requested number of noise documents', () => {
    const docs = generateNoise('scenario-1', 'fp-1', baseOptions);
    expect(docs.length).toBe(10);
  });

  it('marks all docs with emulation mode=noise', () => {
    const docs = generateNoise('scenario-1', 'fp-1', baseOptions);
    for (const doc of docs) {
      expect(doc.kibana.alert.emulation.mode).toBe('noise');
      expect(doc.event.dataset).toBe('emulation.noise');
    }
  });

  it('uses correct host info', () => {
    const docs = generateNoise('scenario-1', 'fp-1', baseOptions);
    for (const doc of docs) {
      expect(doc.host.id).toBe('host-1');
      expect(doc.host.name).toBe('DESKTOP-TEST');
    }
  });

  it('sorts documents by timestamp', () => {
    const docs = generateNoise('scenario-1', 'fp-1', { ...baseOptions, count: 20 });
    for (let i = 1; i < docs.length; i++) {
      expect(new Date(docs[i]['@timestamp']).getTime()).toBeGreaterThanOrEqual(
        new Date(docs[i - 1]['@timestamp']).getTime()
      );
    }
  });

  it('includes linux-appropriate processes for linux OS', () => {
    const docs = generateNoise('scenario-1', 'fp-1', {
      ...baseOptions,
      os: 'linux',
    });
    expect(docs.length).toBe(10);
    // All should have linux process names (no .exe)
    for (const doc of docs) {
      expect(doc.process.name).not.toMatch(/\.exe$/);
    }
  });

  it('includes red herrings when requested', () => {
    const docs = generateNoise('scenario-1', 'fp-1', {
      ...baseOptions,
      count: 100,
      includeRedHerrings: true,
    });
    // With 100 docs and red herrings in the pool, at least one should appear
    const hasRedHerring = docs.some(
      (d) =>
        d.process.name === 'schtasks.exe' ||
        d.process.name === 'reg.exe' ||
        d.process.name === 'powershell.exe'
    );
    expect(hasRedHerring).toBe(true);
  });

  it('returns empty array for count=0', () => {
    const docs = generateNoise('scenario-1', 'fp-1', { ...baseOptions, count: 0 });
    expect(docs).toEqual([]);
  });
});
