/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, uiSettingsServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { StartPlugins } from '../plugin';
import {
  AESOP_DECISION_LOG_TITLE,
  AESOP_DEFAULT_DATASET_NAME,
  AesopExplorerDefaultError,
  resolveDefaultConnectorId,
  resolveDefaultDatasetId,
  resolveDefaultInvestigationId,
} from './explorer_defaults';

describe('AESOP explorer defaults', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggerMock.create();
  let privileges: Record<string, boolean>;
  let getDefaultConnector: jest.Mock;
  let resolveByName: jest.Mock;
  let createDataset: jest.Mock;
  let search: jest.Mock;
  let createConversation: jest.Mock;
  let getClient: jest.Mock;

  const buildPlugins = ({
    evals = true,
    agentBuilder = true,
  }: { evals?: boolean; agentBuilder?: boolean } = {}): StartPlugins =>
    ({
      inference: { getDefaultConnector },
      security: {
        authz: {
          actions: { api: { get: (privilege: string) => `api:${privilege}` } },
          checkPrivilegesWithRequest: () => ({
            atSpace: async (_spaceId: string, { kibana }: { kibana: string[] }) => ({
              hasAllRequested: kibana.every((action) => privileges[action.slice(4)] ?? false),
            }),
          }),
        },
      },
      evals: evals ? { datasetService: { getClient } } : undefined,
      agentBuilder: agentBuilder
        ? {
            conversations: {
              getScopedClient: async () => ({ search, create: createConversation }),
            },
          }
        : undefined,
    } as unknown as StartPlugins);

  const deps = (plugins = buildPlugins()) => ({
    pluginsStart: plugins,
    request,
    spaceId: 'sec',
    logger,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    privileges = { read_evals: true, manage_evals: true };
    getDefaultConnector = jest.fn().mockResolvedValue({ connectorId: 'inference-default' });
    resolveByName = jest.fn().mockResolvedValue(undefined);
    createDataset = jest.fn().mockResolvedValue({ id: 'ds-new' });
    getClient = jest.fn().mockReturnValue({ resolveByName, create: createDataset });
    search = jest.fn().mockResolvedValue({ results: [], total: 0 });
    createConversation = jest.fn().mockResolvedValue({ id: 'conv-new' });
  });

  describe('resolveDefaultConnectorId', () => {
    const withSetting = (value: unknown) => {
      const uiSettingsClient = uiSettingsServiceMock.createClient();
      uiSettingsClient.get.mockResolvedValue(value);
      return uiSettingsClient;
    };

    it('prefers the default AI connector setting', async () => {
      await expect(
        resolveDefaultConnectorId({ ...deps(), uiSettingsClient: withSetting('setting-conn') })
      ).resolves.toBe('setting-conn');
      expect(getDefaultConnector).not.toHaveBeenCalled();
    });

    it.each([['NO_DEFAULT_CONNECTOR'], [undefined]])(
      'falls back to the inference default when the setting is %j',
      async (value) => {
        await expect(
          resolveDefaultConnectorId({ ...deps(), uiSettingsClient: withSetting(value) })
        ).resolves.toBe('inference-default');
      }
    );

    it('falls back when reading the setting throws', async () => {
      const uiSettingsClient = uiSettingsServiceMock.createClient();
      uiSettingsClient.get.mockRejectedValue(new Error('boom'));

      await expect(resolveDefaultConnectorId({ ...deps(), uiSettingsClient })).resolves.toBe(
        'inference-default'
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it('fails with a 400 when no connector is available', async () => {
      getDefaultConnector.mockRejectedValue(new Error('no connectors'));

      await expect(
        resolveDefaultConnectorId({ ...deps(), uiSettingsClient: withSetting(undefined) })
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('resolveDefaultDatasetId', () => {
    it('reuses the existing default dataset in the space', async () => {
      resolveByName.mockResolvedValue({ id: 'ds-existing' });

      await expect(resolveDefaultDatasetId(deps())).resolves.toBe('ds-existing');
      expect(getClient).toHaveBeenCalledWith({ spaceId: 'sec' });
      expect(resolveByName).toHaveBeenCalledWith(AESOP_DEFAULT_DATASET_NAME);
      expect(createDataset).not.toHaveBeenCalled();
    });

    it('creates the default dataset when missing', async () => {
      await expect(resolveDefaultDatasetId(deps())).resolves.toBe('ds-new');
      expect(createDataset).toHaveBeenCalledWith(
        expect.objectContaining({ name: AESOP_DEFAULT_DATASET_NAME })
      );
    });

    it('refuses to create without manage_evals', async () => {
      privileges.manage_evals = false;

      await expect(resolveDefaultDatasetId(deps())).rejects.toMatchObject({ statusCode: 403 });
      expect(createDataset).not.toHaveBeenCalled();
    });

    it('refuses to read without read_evals', async () => {
      privileges.read_evals = false;

      await expect(resolveDefaultDatasetId(deps())).rejects.toMatchObject({ statusCode: 403 });
      expect(resolveByName).not.toHaveBeenCalled();
    });

    it('fails with a 400 when the evals plugin is absent', async () => {
      await expect(
        resolveDefaultDatasetId(deps(buildPlugins({ evals: false })))
      ).rejects.toBeInstanceOf(AesopExplorerDefaultError);
    });
  });

  describe('resolveDefaultInvestigationId', () => {
    it('reuses a conversation with the exact decision-log title', async () => {
      search.mockResolvedValue({
        results: [
          { id: 'conv-other', title: `${AESOP_DECISION_LOG_TITLE} (old)` },
          { id: 'conv-log', title: AESOP_DECISION_LOG_TITLE },
        ],
        total: 2,
      });

      await expect(resolveDefaultInvestigationId(deps())).resolves.toBe('conv-log');
      expect(createConversation).not.toHaveBeenCalled();
    });

    it('finds the decision log past the first page of fuzzy title matches', async () => {
      const lookalikes = Array.from({ length: 50 }, (_, index) => ({
        id: `conv-${index}`,
        title: `${AESOP_DECISION_LOG_TITLE} ${index}`,
      }));
      search.mockResolvedValueOnce({ results: lookalikes, total: 51 }).mockResolvedValueOnce({
        results: [{ id: 'conv-log', title: AESOP_DECISION_LOG_TITLE }],
        total: 51,
      });

      await expect(resolveDefaultInvestigationId(deps())).resolves.toBe('conv-log');
      expect(search).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
      expect(createConversation).not.toHaveBeenCalled();
    });

    it('creates the decision log when missing', async () => {
      await expect(resolveDefaultInvestigationId(deps())).resolves.toBe('conv-new');
      expect(createConversation).toHaveBeenCalledWith({ title: AESOP_DECISION_LOG_TITLE });
    });

    it('fails with a 400 when Agent Builder is absent', async () => {
      await expect(
        resolveDefaultInvestigationId(deps(buildPlugins({ agentBuilder: false })))
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
