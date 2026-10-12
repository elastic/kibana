/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  savedObjectsClientMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import {
  MAX_CUSTOM_CONTEXT_SNIPPETS,
  MAX_CUSTOM_CONTEXT_TOTAL_LENGTH,
  type CustomContextSnippet,
} from '../../common/custom_context';
import {
  NIGHTSHIFT_CUSTOM_CONTEXT_SO_ID,
  NIGHTSHIFT_CUSTOM_CONTEXT_SO_TYPE,
} from '../saved_objects';
import { createCustomContextClient } from './custom_context_client';
import {
  CustomContextConflictError,
  CustomContextDisabledError,
  CustomContextValidationError,
} from './errors';

const EXISTING: CustomContextSnippet = {
  id: 'existing-id',
  text: 'Rule out release regressions first.',
  author_name: 'Jane Doe',
  created_at: '2026-01-01T00:00:00.000Z',
};

const setup = ({
  stored,
  nightshiftEnabled = true,
  user = { username: 'jdoe', full_name: 'John Doe' },
  hasReadPrivilege = true,
  withSecurityPlugin = true,
}: {
  stored?: CustomContextSnippet[];
  nightshiftEnabled?: boolean;
  user?: { username: string; full_name?: string } | null;
  hasReadPrivilege?: boolean;
  withSecurityPlugin?: boolean;
} = {}) => {
  const core = coreMock.createStart();
  core.featureFlags.getBooleanValue$.mockImplementation((flag) =>
    of(flag === NIGHTSHIFT_ENABLED_FLAG ? nightshiftEnabled : false)
  );
  jest
    .mocked(core.security.authc.getCurrentUser)
    .mockReturnValue(user ? mockAuthenticatedUser({ full_name: '', ...user }) : null);

  const savedObjects = savedObjectsServiceMock.createStartContract();
  const soClient = savedObjectsClientMock.create();
  soClient.asScopedToNamespace.mockReturnValue(soClient);
  savedObjects.getScopedClient.mockReturnValue(soClient);
  if (stored) {
    soClient.get.mockResolvedValue({
      id: NIGHTSHIFT_CUSTOM_CONTEXT_SO_ID,
      type: NIGHTSHIFT_CUSTOM_CONTEXT_SO_TYPE,
      references: [],
      version: 'v1',
      attributes: { snippets: stored },
    });
  } else {
    soClient.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        NIGHTSHIFT_CUSTOM_CONTEXT_SO_TYPE,
        NIGHTSHIFT_CUSTOM_CONTEXT_SO_ID
      )
    );
  }
  soClient.create.mockImplementation(async (type, attributes) => ({
    id: NIGHTSHIFT_CUSTOM_CONTEXT_SO_ID,
    type,
    references: [],
    version: 'v2',
    attributes,
  }));

  const spaces = {
    spacesService: { getSpaceId: jest.fn(() => 'space-a') },
  } as unknown as SpacesPluginStart;

  const checkPrivileges = jest.fn(async () => ({ hasAllRequested: hasReadPrivilege }));
  const securityPlugin = {
    authz: {
      mode: { useRbacForRequest: jest.fn(() => true) },
      checkPrivilegesDynamicallyWithRequest: jest.fn(() => checkPrivileges),
      actions: { api: { get: (operation: string) => `api:${operation}` } },
    },
  } as unknown as SecurityPluginStart;

  const client = createCustomContextClient({
    getDeps: () => ({
      featureFlags: core.featureFlags,
      savedObjects,
      security: core.security,
      securityPlugin: withSecurityPlugin ? securityPlugin : undefined,
      spaces,
    }),
  });
  return { client, soClient, checkPrivileges, request: httpServerMock.createKibanaRequest() };
};

describe('createCustomContextClient', () => {
  it('returns no snippets when the space has no custom context yet', async () => {
    const { client, request, soClient } = setup();

    await expect(client.get(request)).resolves.toEqual({ snippets: [] });
    expect(soClient.asScopedToNamespace).toHaveBeenCalledWith('space-a');
  });

  it('returns the stored snippets and version', async () => {
    const { client, request } = setup({ stored: [EXISTING] });

    await expect(client.get(request)).resolves.toEqual({ snippets: [EXISTING], version: 'v1' });
  });

  it('is disabled unless the nightshift flag is on', async () => {
    const { client, request } = setup({ nightshiftEnabled: false });

    await expect(client.get(request)).rejects.toBeInstanceOf(CustomContextDisabledError);
    await expect(client.replace(request, { snippets: [] })).rejects.toBeInstanceOf(
      CustomContextDisabledError
    );
  });

  it('keeps existing snippet metadata, stamps new snippets, and drops blank ones', async () => {
    const { client, request, soClient } = setup({ stored: [EXISTING] });

    const result = await client.replace(request, {
      snippets: [
        { id: EXISTING.id, text: EXISTING.text },
        { text: ' Payments is in us-east-1. ' },
        { text: '  ' },
      ],
      version: 'v1',
    });

    expect(result.version).toBe('v2');
    expect(result.snippets).toEqual([
      EXISTING,
      {
        id: expect.any(String),
        text: 'Payments is in us-east-1.',
        author_name: 'John Doe',
        created_at: expect.any(String),
      },
    ]);
    expect(result.snippets[1].id).not.toBe(EXISTING.id);
    expect(soClient.create).toHaveBeenCalledWith(
      NIGHTSHIFT_CUSTOM_CONTEXT_SO_TYPE,
      { snippets: result.snippets },
      { id: NIGHTSHIFT_CUSTOM_CONTEXT_SO_ID, overwrite: true, version: 'v1' }
    );
  });

  it('records who edited a snippet and when, keeping the original author', async () => {
    const { client, request } = setup({ stored: [EXISTING] });

    const result = await client.replace(request, {
      snippets: [{ id: EXISTING.id, text: 'Rule out config regressions first.' }],
      version: 'v1',
    });

    expect(result.snippets).toEqual([
      {
        ...EXISTING,
        text: 'Rule out config regressions first.',
        updated_by: 'John Doe',
        updated_at: expect.any(String),
      },
    ]);
  });

  it('removes snippets that are not listed', async () => {
    const { client, request } = setup({ stored: [EXISTING] });

    await expect(client.replace(request, { snippets: [], version: 'v1' })).resolves.toEqual({
      snippets: [],
      version: 'v2',
    });
  });

  it('falls back to the username, then to Unknown, for the author', async () => {
    const withUsername = setup({ user: { username: 'jdoe' } });
    const byUsername = await withUsername.client.replace(withUsername.request, {
      snippets: [{ text: 'a' }],
    });
    expect(byUsername.snippets[0].author_name).toBe('jdoe');

    const anonymous = setup({ user: null });
    const byUnknown = await anonymous.client.replace(anonymous.request, {
      snippets: [{ text: 'a' }],
    });
    expect(byUnknown.snippets[0].author_name).toBe('Unknown');
  });

  it('creates the first object without overwrite so concurrent first writes conflict', async () => {
    const { client, request, soClient } = setup();

    await client.replace(request, { snippets: [{ text: 'a' }] });

    expect(soClient.create).toHaveBeenCalledWith(
      NIGHTSHIFT_CUSTOM_CONTEXT_SO_TYPE,
      expect.anything(),
      {
        id: NIGHTSHIFT_CUSTOM_CONTEXT_SO_ID,
      }
    );
  });

  it('rejects an unversioned write once an object exists', async () => {
    const { client, request } = setup({ stored: [EXISTING] });

    await expect(client.replace(request, { snippets: [] })).rejects.toBeInstanceOf(
      CustomContextConflictError
    );
  });

  it('maps saved object version conflicts to a conflict error', async () => {
    const { client, request, soClient } = setup({ stored: [EXISTING] });
    soClient.create.mockRejectedValue(
      SavedObjectsErrorHelpers.createConflictError(
        NIGHTSHIFT_CUSTOM_CONTEXT_SO_TYPE,
        NIGHTSHIFT_CUSTOM_CONTEXT_SO_ID
      )
    );

    await expect(
      client.replace(request, { snippets: [], version: 'stale' })
    ).rejects.toBeInstanceOf(CustomContextConflictError);
  });

  it('enforces the snippet count and total length limits', async () => {
    const { client, request } = setup();

    await expect(
      client.replace(request, {
        snippets: Array.from({ length: MAX_CUSTOM_CONTEXT_SNIPPETS + 1 }, () => ({ text: 'a' })),
      })
    ).rejects.toBeInstanceOf(CustomContextValidationError);

    const chunk = 'a'.repeat(MAX_CUSTOM_CONTEXT_TOTAL_LENGTH / 8 + 1);
    await expect(
      client.replace(request, { snippets: Array.from({ length: 8 }, () => ({ text: chunk })) })
    ).rejects.toBeInstanceOf(CustomContextValidationError);
  });

  it('formats the instructions for the requested space without the feature flag check', async () => {
    const { client, request, soClient } = setup({ stored: [EXISTING], nightshiftEnabled: false });

    await expect(client.getInstructions(request, 'space-b')).resolves.toBe(
      `**USER CONTEXT**\n<user_provided_context>\n${EXISTING.text}\n</user_provided_context>`
    );
    expect(soClient.asScopedToNamespace).toHaveBeenCalledWith('space-b');
  });

  it('returns no instructions to callers without the Nightshift read privilege', async () => {
    const { client, request, soClient, checkPrivileges } = setup({
      stored: [EXISTING],
      hasReadPrivilege: false,
    });

    await expect(client.getInstructions(request, 'space-a')).resolves.toBe('');
    expect(checkPrivileges).toHaveBeenCalledWith({ kibana: ['api:read_nightshift'] });
    expect(soClient.get).not.toHaveBeenCalled();
  });

  it('returns no instructions when privileges cannot be verified', async () => {
    const { client, request, soClient } = setup({ stored: [EXISTING], withSecurityPlugin: false });

    await expect(client.getInstructions(request, 'space-a')).resolves.toBe('');
    expect(soClient.get).not.toHaveBeenCalled();
  });

  it('returns empty instructions when the space has no custom context', async () => {
    const { client, request } = setup();

    await expect(client.getInstructions(request, 'space-a')).resolves.toBe('');
  });
});
