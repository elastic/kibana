/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleLibraryAttributes } from '../types';
import type { RuleLibraryProvider } from '../providers/types';
import { scanLibrary } from './scan_library';

const library: RuleLibraryAttributes = {
  name: 'scan',
  title: 'scan',
  provider: { type: 'git', url: 'https://github.com/org/library' },
};

const createProvider = () => {
  const provider = {
    resolveVersion: jest.fn(),
    inspect: jest.fn(),
  };
  return { provider, typed: provider as unknown as RuleLibraryProvider };
};

describe('scanLibrary', () => {
  it('reports the latest release, its rule count and its manifest', async () => {
    const { provider, typed } = createProvider();
    provider.resolveVersion.mockResolvedValue({ version: '0.0.1', ref: 'abc123' });
    provider.inspect.mockResolvedValue({ ruleCount: 10, manifest: { title: 'Community' } });

    await expect(scanLibrary({ provider: typed, library })).resolves.toEqual({
      version: '0.0.1',
      ruleCount: 10,
      manifest: { title: 'Community' },
      manifestError: undefined,
    });
    expect(provider.inspect).toHaveBeenCalledWith(library, { version: '0.0.1', ref: 'abc123' });
  });

  it('scans the pinned release when one is given', async () => {
    const { provider, typed } = createProvider();
    provider.resolveVersion.mockResolvedValue({ version: '0.0.1' });
    provider.inspect.mockResolvedValue({ ruleCount: 3 });

    await scanLibrary({ provider: typed, library, pinnedVersion: '0.0.1' });

    expect(provider.resolveVersion).toHaveBeenCalledWith(library, { pinned: '0.0.1' });
  });

  it('still reports the count when the manifest cannot be used', async () => {
    const { provider, typed } = createProvider();
    provider.resolveVersion.mockResolvedValue({ version: '1.0.0' });
    provider.inspect.mockResolvedValue({ ruleCount: 4, manifestError: 'not valid YAML' });

    const result = await scanLibrary({ provider: typed, library });

    expect(result.ruleCount).toBe(4);
    expect(result.manifest).toBeUndefined();
    expect(result.manifestError).toBe('not valid YAML');
  });

  it('does not read the release when the version cannot be resolved', async () => {
    const { provider, typed } = createProvider();
    provider.resolveVersion.mockRejectedValue(new Error('No release tags'));

    await expect(scanLibrary({ provider: typed, library })).rejects.toThrow('No release tags');
    expect(provider.inspect).not.toHaveBeenCalled();
  });
});
