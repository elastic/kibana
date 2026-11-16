/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  httpServerMock,
  savedObjectsClientMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_ID,
  NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE,
  nightshiftSandboxAllowlistAttributesSchemaV1,
} from '../saved_objects';
import { createSandboxAllowlistClient } from './sandbox_allowlist_client';
import { SandboxAllowlistDisabledError, SandboxAllowlistValidationError } from './errors';

const setup = ({
  stored,
  withSavedObjects = true,
}: {
  stored?: unknown;
  withSavedObjects?: boolean;
} = {}) => {
  const savedObjects = savedObjectsServiceMock.createStartContract();
  const soClient = savedObjectsClientMock.create();
  soClient.asScopedToNamespace.mockReturnValue(soClient);
  savedObjects.getScopedClient.mockReturnValue(soClient);

  if (stored !== undefined) {
    soClient.get.mockResolvedValue({
      id: NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_ID,
      type: NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE,
      references: [],
      version: 'v1',
      attributes: { hosts: stored },
    });
  } else {
    soClient.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE,
        NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_ID
      )
    );
  }
  soClient.create.mockImplementation(async (type, attributes) => ({
    id: NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_ID,
    type,
    references: [],
    version: 'v1',
    attributes,
  }));

  const spaces = {
    spacesService: { getSpaceId: jest.fn(() => 'space-a') },
  } as unknown as SpacesPluginStart;

  const client = createSandboxAllowlistClient({
    getDeps: () => ({
      savedObjects: withSavedObjects ? savedObjects : undefined,
      spaces,
    }),
  });
  return {
    client,
    savedObjects,
    soClient,
    request: httpServerMock.createKibanaRequest(),
  };
};

describe('createSandboxAllowlistClient', () => {
  it('returns an empty allowlist when none is stored yet and scopes to the current space', async () => {
    const { client, request, savedObjects, soClient } = setup();

    await expect(client.get(request)).resolves.toEqual({ hosts: [] });
    expect(savedObjects.getScopedClient).toHaveBeenCalledWith(request, {
      excludedExtensions: expect.any(Array),
      includedHiddenTypes: [NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE],
    });
    expect(soClient.asScopedToNamespace).toHaveBeenCalledWith('space-a');
  });

  it('normalizes and de-duplicates hosts on replace', async () => {
    const { client, request, soClient } = setup();

    const result = await client.replace(request, {
      hosts: ['API.GitHub.com.', 'api.github.com', '  uploads.github.com  '],
    });

    expect(result).toEqual({ hosts: ['api.github.com', 'uploads.github.com'] });
    expect(soClient.create).toHaveBeenCalledWith(
      NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE,
      { hosts: ['api.github.com', 'uploads.github.com'] },
      { id: NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_ID, overwrite: true }
    );
  });

  it('throws SandboxAllowlistValidationError without writing when any entry is invalid', async () => {
    const { client, request, soClient } = setup();

    await expect(client.replace(request, { hosts: ['api.github.com', '*.com'] })).rejects.toThrow(
      SandboxAllowlistValidationError
    );
    expect(soClient.create).not.toHaveBeenCalled();
  });

  it('throws SandboxAllowlistDisabledError when savedObjects is unavailable', async () => {
    const { client, request } = setup({ withSavedObjects: false });

    await expect(client.get(request)).rejects.toThrow(SandboxAllowlistDisabledError);
    await expect(client.replace(request, { hosts: [] })).rejects.toThrow(
      SandboxAllowlistDisabledError
    );
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
      await expect(client.getHostsForCommand(request)).rejects.toThrow(
        SandboxAllowlistValidationError
      );
    });

    it('fails closed when stored hosts attribute is not a string array', async () => {
      const { client, request } = setup({ stored: ['api.github.com', 123] });
      await expect(client.getHostsForCommand(request)).rejects.toThrow(
        SandboxAllowlistValidationError
      );
    });
  });

  it('keeps stored policies isolated per space across replace and get round-trips', async () => {
    const bySpace = new Map<string, string[]>();
    const savedObjects = savedObjectsServiceMock.createStartContract();
    const rootClient = savedObjectsClientMock.create();
    savedObjects.getScopedClient.mockReturnValue(rootClient);
    rootClient.asScopedToNamespace.mockImplementation((ns) => {
      const space = Array.isArray(ns) ? ns[0] : ns;
      const scoped = savedObjectsClientMock.create();
      scoped.get.mockImplementation(async () => {
        const hosts = bySpace.get(space);
        if (!hosts) {
          throw SavedObjectsErrorHelpers.createGenericNotFoundError(
            NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE,
            NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_ID
          );
        }
        return {
          id: NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_ID,
          type: NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE,
          references: [],
          version: 'v1',
          attributes: { hosts },
        };
      });
      scoped.create.mockImplementation(async (type, attributes) => {
        const { hosts } = attributes as { hosts: string[] };
        bySpace.set(space, hosts);
        return {
          id: NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_ID,
          type,
          references: [],
          version: 'v1',
          attributes,
        };
      });
      return scoped;
    });

    let activeSpace = 'space-a';
    const spaces = {
      spacesService: { getSpaceId: jest.fn(() => activeSpace) },
    } as unknown as SpacesPluginStart;
    const client = createSandboxAllowlistClient({
      getDeps: () => ({ savedObjects, spaces }),
    });
    const req = httpServerMock.createKibanaRequest();

    await client.replace(req, { hosts: ['api.github.com'] });
    activeSpace = 'space-b';
    await client.replace(req, { hosts: ['pypi.org GET /simple/'] });

    activeSpace = 'space-a';
    await expect(client.getHostsForCommand(req)).resolves.toEqual(['api.github.com']);
    activeSpace = 'space-b';
    await expect(client.getHostsForCommand(req)).resolves.toEqual([
      'allow * pypi.org GET /simple/',
    ]);
  });
});

describe('nightshiftSandboxAllowlistSavedObjectType schema', () => {
  const schema = nightshiftSandboxAllowlistAttributesSchemaV1;

  it('accepts a normalized list of hosts and DSL rules including rules over 253 chars up to 512 chars', () => {
    const prefix = 'allow https api.github.com:443 GET /';
    const rule512 = `${prefix}${'a'.repeat(512 - prefix.length)}`;
    expect(() =>
      schema.validate({
        hosts: [
          'api.github.com',
          '*.datadoghq.com',
          'allow * pypi.org GET,HEAD /simple/',
          'deny * api.github.com POST /gists',
          'xn--bcher-kva.example',
          rule512,
        ],
      })
    ).not.toThrow();

    expect(() => schema.validate({ hosts: [`${rule512}x`] })).toThrow();
  });

  it.each([[['*']], [['*.com']], [['API.github.com']], [['a.example', 'a.example']]])(
    'rejects invalid or unnormalized hosts %p',
    (hosts) => {
      expect(() => schema.validate({ hosts })).toThrow();
    }
  );

  it('rejects more than 32 rules', () => {
    expect(() =>
      schema.validate({
        hosts: Array.from({ length: 33 }, (_, index) => `h${index}.example`),
      })
    ).toThrow();
  });
});
