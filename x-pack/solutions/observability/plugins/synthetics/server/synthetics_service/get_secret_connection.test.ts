/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SyntheticsServerSetup } from '../types';
import { getSecretConnectionConfigs } from './get_secret_connection';

const connection = (name: string, address: string) => ({
  attributes: {
    name,
    type: 'hashicorp_vault',
    config: { address, authMethod: 'token' },
    secrets: { token: `${name}-token` },
  },
});

const setup = (secretConnections: { enabled?: boolean; allowedHosts?: string[] }) => {
  const createPointInTimeFinderDecryptedAsInternalUser = jest.fn().mockResolvedValue({
    async *find() {
      yield {
        saved_objects: [
          connection('allowed', 'https://vault.example.com'),
          connection('denied', 'https://other.example'),
        ],
      };
    },
    close: jest.fn().mockResolvedValue(undefined),
  });
  const server = {
    logger: loggerMock.create(),
    config: { secretConnections: { allowedHosts: ['*'], ...secretConnections } },
    encryptedSavedObjects: {
      getClient: () => ({ createPointInTimeFinderDecryptedAsInternalUser }),
    },
  } as unknown as SyntheticsServerSetup;
  return { server, createPointInTimeFinderDecryptedAsInternalUser };
};

describe('getSecretConnectionConfigs', () => {
  it('leaves out saved connections whose host is no longer allowed', async () => {
    const { server } = setup({ allowedHosts: ['vault.example.com'] });

    const configs = await getSecretConnectionConfigs(server, 'default');

    expect(configs.map(({ name }) => name)).toEqual(['allowed']);
    expect(server.logger.warn).toHaveBeenCalledWith(expect.stringContaining('"denied"'));
  });

  it('delivers every connection when all hosts are allowed', async () => {
    const { server } = setup({});

    const configs = await getSecretConnectionConfigs(server, 'default');

    expect(configs.map(({ name }) => name)).toEqual(['allowed', 'denied']);
  });

  it('delivers nothing, without reading connections, while secret connections are disabled', async () => {
    const { server, createPointInTimeFinderDecryptedAsInternalUser } = setup({ enabled: false });

    expect(await getSecretConnectionConfigs(server, 'default')).toEqual([]);
    expect(createPointInTimeFinderDecryptedAsInternalUser).not.toHaveBeenCalled();
  });
});
