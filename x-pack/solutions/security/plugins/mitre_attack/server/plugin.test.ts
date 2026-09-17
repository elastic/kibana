/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { MitreEntity } from '@kbn/security-mitre-attack-common';
import { getMockMitreTactic } from './mocks/mitre_entities.mock';
import type { SavedObjectsBulkResponse } from '@kbn/core/server';
import { loadMitreArtifact } from '@kbn/security-mitre-attack-server';
import { MitreAttackPlugin } from './plugin';
import { MITRE_ATTACK_ENTITY_SO_TYPE } from './saved_objects';

jest.mock('@kbn/security-mitre-attack-server', () => ({
  loadMitreArtifact: jest.fn(),
}));

const mockLoadMitreArtifact = jest.mocked(loadMitreArtifact);

const flushPromises = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('MitreAttackPlugin', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('flag off (managedSourceEnabled: false)', () => {
    it('does not register the SO type, create a repository, or run population', async () => {
      const context = coreMock.createPluginInitializerContext({ managedSourceEnabled: false });
      const plugin = new MitreAttackPlugin(context);
      const coreSetup = coreMock.createSetup();
      const coreStart = coreMock.createStart();

      plugin.setup(coreSetup);
      plugin.start(coreStart);

      await flushPromises();

      // Flag off leaves no MITRE footprint: no type registration at all
      expect(coreSetup.savedObjects.registerType).not.toHaveBeenCalled();

      // No population with flag off
      expect(coreStart.savedObjects.createInternalRepository).not.toHaveBeenCalled();
      expect(mockLoadMitreArtifact).not.toHaveBeenCalled();
    });
  });

  describe('flag on (managedSourceEnabled: true)', () => {
    it('registers the SO type and triggers population', async () => {
      const context = coreMock.createPluginInitializerContext({ managedSourceEnabled: true });
      const plugin = new MitreAttackPlugin(context);
      const coreSetup = coreMock.createSetup();
      const coreStart = coreMock.createStart();
      const savedObjectsRepository = savedObjectsRepositoryMock.create();

      const entity = getMockMitreTactic();
      mockLoadMitreArtifact.mockReturnValue([entity]);
      savedObjectsRepository.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: 'enterprise:15.1:TA0001',
            type: MITRE_ATTACK_ENTITY_SO_TYPE,
            attributes: entity,
            references: [],
            version: '1',
          },
        ],
      } as SavedObjectsBulkResponse<MitreEntity>);
      coreStart.savedObjects.createInternalRepository.mockReturnValue(savedObjectsRepository);

      plugin.setup(coreSetup);
      plugin.start(coreStart);

      await flushPromises();

      // SO type registered
      expect(coreSetup.savedObjects.registerType).toHaveBeenCalledWith(
        expect.objectContaining({ name: MITRE_ATTACK_ENTITY_SO_TYPE })
      );

      // Repository created for the right type
      expect(coreStart.savedObjects.createInternalRepository).toHaveBeenCalledWith([
        MITRE_ATTACK_ENTITY_SO_TYPE,
      ]);

      // Population ran
      expect(savedObjectsRepository.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'enterprise:15.1:TA0001',
            type: MITRE_ATTACK_ENTITY_SO_TYPE,
          }),
        ]),
        { overwrite: true }
      );
    });

    it('start() returns a defined contract synchronously when population fails', () => {
      const context = coreMock.createPluginInitializerContext({ managedSourceEnabled: true });
      const plugin = new MitreAttackPlugin(context);
      const coreSetup = coreMock.createSetup();
      const coreStart = coreMock.createStart();
      const savedObjectsRepository = savedObjectsRepositoryMock.create();

      mockLoadMitreArtifact.mockImplementation(() => {
        throw new Error('artifact not found');
      });
      coreStart.savedObjects.createInternalRepository.mockReturnValue(savedObjectsRepository);

      plugin.setup(coreSetup);

      // start() is synchronous — no Promise wrapper needed
      const contract = plugin.start(coreStart);
      expect(contract).toBeDefined();

      // Repository creation was still attempted despite the upcoming population failure
      expect(coreStart.savedObjects.createInternalRepository).toHaveBeenCalled();
    });

    it('population failure is logged after the in-flight promise settles', async () => {
      const context = coreMock.createPluginInitializerContext({ managedSourceEnabled: true });
      const plugin = new MitreAttackPlugin(context);
      const coreSetup = coreMock.createSetup();
      const coreStart = coreMock.createStart();
      const savedObjectsRepository = savedObjectsRepositoryMock.create();

      mockLoadMitreArtifact.mockImplementation(() => {
        throw new Error('artifact not found');
      });
      coreStart.savedObjects.createInternalRepository.mockReturnValue(savedObjectsRepository);

      plugin.setup(coreSetup);
      plugin.start(coreStart);

      await flushPromises();

      const logs = loggingSystemMock.collect(context.logger);
      expect(logs.error).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringContaining('artifact not found')]),
        ])
      );
    });
  });
});
