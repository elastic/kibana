/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  httpServerMock,
  savedObjectsServiceMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { OBSERVABILITY_NIGHTSHIFT_SANDBOX_ALLOWLIST } from '@kbn/management-settings-ids';
import { createSandboxAllowlistClient } from './sandbox_allowlist_client';
import { SandboxAllowlistValidationError } from './errors';
import { sandboxAllowlistUiSetting } from './ui_setting';

const setup = ({ stored = [] }: { stored?: string[] } = {}) => {
  const savedObjects = savedObjectsServiceMock.createStartContract();
  const uiSettings = uiSettingsServiceMock.createStartContract();
  const uiSettingsClient = uiSettingsServiceMock.createClient();
  uiSettings.asScopedToClient.mockReturnValue(uiSettingsClient);
  uiSettingsClient.get.mockResolvedValue(stored);

  const client = createSandboxAllowlistClient({ getDeps: () => ({ savedObjects, uiSettings }) });
  return { client, savedObjects, uiSettingsClient, request: httpServerMock.createKibanaRequest() };
};

describe('SandboxAllowlistClient', () => {
  it('reads the advanced setting without the security extension', async () => {
    const { client, savedObjects, uiSettingsClient, request } = setup({
      stored: ['api.github.com'],
    });

    await expect(client.get(request)).resolves.toEqual({ hosts: ['api.github.com'] });
    expect(uiSettingsClient.get).toHaveBeenCalledWith(OBSERVABILITY_NIGHTSHIFT_SANDBOX_ALLOWLIST);
    expect(savedObjects.getScopedClient).toHaveBeenCalledWith(request, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });
  });

  it('stores normalized hosts', async () => {
    const { client, uiSettingsClient, request } = setup();

    const result = await client.replace(request, { hosts: ['API.GitHub.com.', 'bücher.example'] });

    expect(result).toEqual({ hosts: ['api.github.com', 'xn--bcher-kva.example'] });
    expect(uiSettingsClient.set).toHaveBeenCalledWith(OBSERVABILITY_NIGHTSHIFT_SANDBOX_ALLOWLIST, [
      'api.github.com',
      'xn--bcher-kva.example',
    ]);
  });

  it('rejects wildcards and other invalid entries without writing', async () => {
    const { client, uiSettingsClient, request } = setup();
    await expect(
      client.replace(request, { hosts: ['*.github.com', 'https://x.example'] })
    ).rejects.toBeInstanceOf(SandboxAllowlistValidationError);
    expect(uiSettingsClient.set).not.toHaveBeenCalled();
  });

  describe('getHostsForCommand', () => {
    it('returns the stored hosts', async () => {
      const { client, request } = setup({ stored: ['api.github.com'] });
      await expect(client.getHostsForCommand(request)).resolves.toEqual(['api.github.com']);
    });

    it('returns no hosts when nothing is stored', async () => {
      const { client, request } = setup();
      await expect(client.getHostsForCommand(request)).resolves.toEqual([]);
    });

    it('fails closed on a stored list the write validation would reject', async () => {
      const { client, request } = setup({ stored: ['api.github.com', '*'] });
      await expect(client.getHostsForCommand(request)).resolves.toEqual([]);
    });
  });
});

describe('sandboxAllowlistUiSetting schema', () => {
  const { schema } = sandboxAllowlistUiSetting[OBSERVABILITY_NIGHTSHIFT_SANDBOX_ALLOWLIST];

  it('accepts a normalized list', () => {
    expect(() => schema.validate(['api.github.com', 'xn--bcher-kva.example'])).not.toThrow();
  });

  it.each([[['*']], [['*.github.com']], [['API.github.com']], [['a.example', 'a.example']]])(
    'rejects %p written through the generic settings API',
    (hosts) => {
      expect(() => schema.validate(hosts)).toThrow();
    }
  );

  it('rejects more than 32 hosts', () => {
    expect(() =>
      schema.validate(Array.from({ length: 33 }, (_, index) => `h${index}.example`))
    ).toThrow();
  });
});
