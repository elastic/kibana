/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RuleLibraryProvider } from '../providers/types';
import type { RuleLibraryAttributes } from '../types';
import { refreshRuleLibrary } from './refresh_rule_library';

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger;

const savedAttributes = (
  overrides: Partial<RuleLibraryAttributes> = {}
): RuleLibraryAttributes => ({
  name: 'custom',
  title: 'rules-library',
  provider: { type: 'git', url: 'https://github.com/org/rules-library' },
  ...overrides,
});

describe('refreshRuleLibrary', () => {
  const get = jest.fn();
  const update = jest.fn();
  const bulkCreate = jest.fn();
  const client = { get, update, bulkCreate } as unknown as SavedObjectsClientContract;

  const resolveVersion = jest.fn();
  const inspect = jest.fn();
  const readLatestItems = jest.fn();
  const provider = { resolveVersion, inspect, readLatestItems } as unknown as RuleLibraryProvider;

  const finalUpdate = () => update.mock.calls.map(([, , attributes]) => attributes).pop();

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue({ attributes: savedAttributes(), version: 'WzEsMV0=' });
    update.mockResolvedValue({});
    bulkCreate.mockResolvedValue({ saved_objects: [{ id: 'x' }] });
    resolveVersion.mockResolvedValue({ version: '1.0.0', ref: 'abc123' });
    readLatestItems.mockImplementation(async (_library, _ref, onBatch) => {
      await onBatch([{ rule_id: 'a', version: 1, path: 'rules/linux/a.yml', attributes: {} }]);
    });
  });

  it('takes the title, description, license, owner and icon from the manifest', async () => {
    inspect.mockResolvedValue({
      ruleCount: 1,
      manifest: {
        title: 'Elastic Community Rules',
        description: 'Contributed by the community',
        license: 'Elastic-2.0',
        owner: { type: 'community' },
        images: [{ src: '/logo.svg' }],
      },
    });

    const result = await refreshRuleLibrary({ client, provider, logger, id: 'custom' });

    expect(result.outcome).toBe('refreshed');
    expect(finalUpdate()).toEqual(
      expect.objectContaining({
        title: 'Elastic Community Rules',
        description: 'Contributed by the community',
        license: 'Elastic-2.0',
        owner: { type: 'community' },
        images: [{ src: '/logo.svg' }],
        version: '1.0.0',
        refresh_status: 'refreshed',
      })
    );
  });

  it('stamps the library title on each rule it writes, so installed rules can show it', async () => {
    inspect.mockResolvedValue({ ruleCount: 1, manifest: { title: 'Elastic Community Rules' } });

    await refreshRuleLibrary({ client, provider, logger, id: 'custom' });

    const [objects] = bulkCreate.mock.calls[0];
    expect(objects[0].attributes).toEqual(
      expect.objectContaining({
        library_id: 'custom',
        library_title: 'Elastic Community Rules',
        library_path: 'rules/linux/a.yml',
      })
    );
  });

  it('keeps what was saved for a field the manifest does not have', async () => {
    inspect.mockResolvedValue({ ruleCount: 1, manifest: { license: 'Apache-2.0' } });

    await refreshRuleLibrary({ client, provider, logger, id: 'custom' });

    expect(finalUpdate()).toEqual(expect.objectContaining({ license: 'Apache-2.0' }));
    expect(finalUpdate()).not.toHaveProperty('title');
    expect(bulkCreate.mock.calls[0][0][0].attributes.library_title).toBe('rules-library');
  });

  it('still refreshes a library whose manifest cannot be used', async () => {
    inspect.mockResolvedValue({ ruleCount: 1, manifestError: 'not valid YAML' });

    const result = await refreshRuleLibrary({ client, provider, logger, id: 'custom' });

    expect(result.outcome).toBe('refreshed');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not valid YAML'));
  });

  it('still refreshes a library whose manifest cannot be read', async () => {
    inspect.mockRejectedValue(new Error('connection reset'));

    const result = await refreshRuleLibrary({ client, provider, logger, id: 'custom' });

    expect(result.outcome).toBe('refreshed');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('connection reset'));
  });

  it('does not look for a manifest in a Fleet library', async () => {
    get.mockResolvedValue({
      attributes: savedAttributes({ provider: { type: 'fleet' } }),
      version: 'WzEsMV0=',
    });

    await refreshRuleLibrary({ client, provider, logger, id: 'elastic' });

    expect(inspect).not.toHaveBeenCalled();
  });

  it('passes the decrypted secret to the manifest read and to reading the rules', async () => {
    inspect.mockResolvedValue({ ruleCount: 1 });

    await refreshRuleLibrary({ client, provider, logger, id: 'custom', secret: 'token' });

    expect(inspect.mock.calls[0][0].secret).toBe('token');
    expect(readLatestItems.mock.calls[0][0].secret).toBe('token');
  });
});
