/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  coreMock,
  loggingSystemMock,
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
} from '@kbn/core/server/mocks';
import {
  createSessionsSettingsGetter,
  getEffectiveSessionsSettings,
  getSavedSessionsSettings,
  saveSessionsSettings,
} from './sessions_settings';

const TYPE = 'digital-experience-sessions-settings';
const ID = 'digital-experience-sessions-settings';
const DEFAULTS = { frequency: '1m', concurrency: 2 };

const savedObject = <T>(attributes: T) => ({
  id: ID,
  type: TYPE,
  references: [],
  attributes,
});

const notFound = () => SavedObjectsErrorHelpers.createGenericNotFoundError(TYPE, ID);

describe('getSavedSessionsSettings', () => {
  it('reads the one settings object', async () => {
    const client = savedObjectsClientMock.create();
    client.get.mockResolvedValue(savedObject({ frequency: '5m' }));

    expect(await getSavedSessionsSettings(client)).toEqual({ frequency: '5m' });
    expect(client.get).toHaveBeenCalledWith(TYPE, ID);
  });

  it('reads none before any are saved', async () => {
    const client = savedObjectsClientMock.create();
    client.get.mockRejectedValue(notFound());

    expect(await getSavedSessionsSettings(client)).toEqual({});
  });

  it('fails on other errors, such as a user without the privilege', async () => {
    const client = savedObjectsClientMock.create();
    client.get.mockRejectedValue(SavedObjectsErrorHelpers.decorateForbiddenError(new Error('no')));

    await expect(getSavedSessionsSettings(client)).rejects.toThrow('no');
  });
});

describe('getEffectiveSessionsSettings', () => {
  it.each([
    [{}, DEFAULTS],
    [{ frequency: '5m' }, { frequency: '5m', concurrency: 2 }],
    [{ concurrency: 4 }, { frequency: '1m', concurrency: 4 }],
    [
      { frequency: '30s', concurrency: 8 },
      { frequency: '30s', concurrency: 8 },
    ],
  ])('lays saved settings %j over the kibana.yml ones', async (attributes, expected) => {
    const client = savedObjectsClientMock.create();
    client.get.mockResolvedValue(savedObject(attributes));
    const logger = loggingSystemMock.createLogger();

    expect(await getEffectiveSessionsSettings({ client, defaults: DEFAULTS, logger })).toEqual(
      expected
    );
  });

  it('uses the kibana.yml settings before any are saved, quietly', async () => {
    const client = savedObjectsClientMock.create();
    client.get.mockRejectedValue(notFound());
    const logger = loggingSystemMock.createLogger();

    expect(await getEffectiveSessionsSettings({ client, defaults: DEFAULTS, logger })).toEqual(
      DEFAULTS
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns and uses the kibana.yml settings when the saved ones cannot be read', async () => {
    const client = savedObjectsClientMock.create();
    client.get.mockRejectedValue(new Error('index unavailable'));
    const logger = loggingSystemMock.createLogger();

    expect(await getEffectiveSessionsSettings({ client, defaults: DEFAULTS, logger })).toEqual(
      DEFAULTS
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('index unavailable'));
  });
});

describe('saveSessionsSettings', () => {
  it('replaces the saved settings, leaving out the ones that follow kibana.yml', async () => {
    const client = savedObjectsClientMock.create();
    client.create.mockResolvedValue(savedObject({ concurrency: 4 }));

    expect(await saveSessionsSettings(client, { frequency: undefined, concurrency: 4 })).toEqual({
      concurrency: 4,
    });
    expect(client.create).toHaveBeenCalledWith(
      TYPE,
      { concurrency: 4 },
      { id: ID, overwrite: true }
    );
  });
});

describe('createSessionsSettingsGetter', () => {
  it('reads the effective settings with one internal repository of the hidden type', async () => {
    const core = coreMock.createSetup();
    const [coreStart] = await core.getStartServices();
    const repository = savedObjectsRepositoryMock.create();
    repository.get.mockResolvedValue(savedObject({ frequency: '15m' }));
    jest.mocked(coreStart.savedObjects.createInternalRepository).mockReturnValue(repository);
    const getSettings = createSessionsSettingsGetter({
      core,
      defaults: DEFAULTS,
      logger: loggingSystemMock.createLogger(),
    });

    expect(await getSettings()).toEqual({ frequency: '15m', concurrency: 2 });
    expect(await getSettings()).toEqual({ frequency: '15m', concurrency: 2 });
    expect(coreStart.savedObjects.createInternalRepository).toHaveBeenCalledTimes(1);
    expect(coreStart.savedObjects.createInternalRepository).toHaveBeenCalledWith([TYPE]);
    expect(repository.get).toHaveBeenCalledTimes(2);
  });
});
