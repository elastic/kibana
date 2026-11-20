/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { CREATE_RULE_LIBRARY_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { requestContextMock, requestMock, serverMock } from '../../../routes/__mocks__';
import { createRuleLibraryRoute } from './create_rule_library_route';

const createRequest = (body: Record<string, unknown>) =>
  requestMock.create({ method: 'post', path: CREATE_RULE_LIBRARY_URL, body });

const publicGit = {
  provider: { type: 'git', url: 'https://github.com/org/rules-library', branch: 'main' },
  scope: 'shared',
};

describe('createRuleLibraryRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const savedObjectsClient = savedObjectsClientMock.create();

  const inject = (body: Record<string, unknown>) =>
    server.inject(createRequest(body), requestContextMock.convertContext(context));

  const createdAttributes = () => savedObjectsClient.create.mock.calls[0][1];

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    clients.core.savedObjects.getClient = jest.fn(() => savedObjectsClient);
    savedObjectsClient.create.mockResolvedValue({} as never);
    createRuleLibraryRoute(server.router, clients.logger);
  });

  it('creates the library under a generated id and returns it', async () => {
    const response = await inject(publicGit);

    expect(response.status).toEqual(200);
    expect(response.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      'security-rule-library',
      expect.anything(),
      { id: response.body.id }
    );
  });

  it('names the library after its address until the first refresh reads its manifest', async () => {
    await inject(publicGit);

    expect(createdAttributes()).toEqual(
      expect.objectContaining({
        title: 'rules-library',
        provider: {
          type: 'git',
          url: 'https://github.com/org/rules-library',
          branch: 'main',
          authType: 'none',
        },
      })
    );
  });

  it('shares the library with every space', async () => {
    await inject(publicGit);

    expect(createdAttributes()).not.toHaveProperty('space_id');
  });

  it('keeps a space library in the current space', async () => {
    await inject({ ...publicGit, scope: 'space' });

    expect(createdAttributes()).toEqual(expect.objectContaining({ space_id: 'default' }));
  });

  it('stores the secret and the pinned version', async () => {
    jest.mocked(clients.core.savedObjects.getClient);
    const withEncryption = requestContextMock.createTools();
    withEncryption.clients.core.savedObjects.getClient = jest.fn(() => savedObjectsClient);
    jest
      .mocked(
        (
          withEncryption.context.securitySolution as never as {
            getEncryptedSavedObjectsClient: jest.Mock;
          }
        ).getEncryptedSavedObjectsClient
      )
      .mockReturnValue({} as never);
    const secretServer = serverMock.create();
    createRuleLibraryRoute(secretServer.router, withEncryption.clients.logger);

    await secretServer.inject(
      createRequest({
        ...publicGit,
        provider: { ...publicGit.provider, auth_type: 'token' },
        secret: 'ghp_token',
        pinned_version: '1.0.0',
      }),
      requestContextMock.convertContext(withEncryption.context)
    );

    expect(createdAttributes()).toEqual(
      expect.objectContaining({ secret: 'ghp_token', pinned_version: '1.0.0' })
    );
  });

  it('refuses a secret when it cannot be stored encrypted', async () => {
    const response = await inject({
      ...publicGit,
      provider: { ...publicGit.provider, auth_type: 'token' },
      secret: 'ghp_token',
    });

    expect(response.status).toEqual(400);
    expect(savedObjectsClient.create).not.toHaveBeenCalled();
  });

  describe('validation', () => {
    const rejects = (body: Record<string, unknown>) => {
      expect(server.validate(createRequest(body)).badRequest).toHaveBeenCalled();
    };

    it('needs a scope', () => {
      rejects({ provider: publicGit.provider });
      rejects({ ...publicGit, scope: 'everyone' });
    });

    it('applies the same rules as the scan to the address and the authentication', () => {
      rejects({ ...publicGit, provider: { type: 'git', url: 'http://github.com/org/library' } });
      rejects({
        ...publicGit,
        provider: { type: 'git', url: 'https://github.com/o/l', auth_type: 'token' },
      });
    });

    it('rejects unknown fields', () => {
      rejects({ ...publicGit, id: 'chosen-by-the-client' });
    });
  });
});
