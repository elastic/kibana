/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScriptsLibraryClientInterface } from './types';
import { createMockEndpointAppContextService } from '../../mocks';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import { ScriptsLibraryClient } from './scripts_library_client';
import { createEsFileClient as _createEsFileClient } from '@kbn/files-plugin/server';
import type { createFileMock, createFileClientMock } from '@kbn/files-plugin/server/mocks';
import type { CreateScriptRequestBody } from '../../../../common/api/endpoint/scripts_library';
import { ScriptsLibraryMock } from './mocks';
import { Readable, Transform } from 'stream';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE } from '../../lib/scripts_library';

jest.mock('@kbn/files-plugin/server', () => {
  const actual = jest.requireActual('@kbn/files-plugin/server');
  return {
    ...actual,
    createEsFileClient: jest.fn(),
  };
});

const createEsFileClientMock = _createEsFileClient as jest.Mock;

describe('scripts library client', () => {
  let endpointAppServicesMock: EndpointAppContextService;
  let scriptsClient: ScriptsLibraryClientInterface;
  let filesPluginClient: ReturnType<typeof createFileClientMock>;
  let fileMock: ReturnType<typeof createFileMock>;

  beforeEach(async () => {
    endpointAppServicesMock = createMockEndpointAppContextService();

    const filesPluginMocks = ScriptsLibraryMock.createFilesPluginClient({
      hash: { sha256: 'e5441eb2bb' },
    });

    filesPluginClient = filesPluginMocks.client;
    createEsFileClientMock.mockReturnValue(filesPluginClient);

    fileMock = filesPluginMocks.file;

    ScriptsLibraryMock.applyMocksToSoClient(
      endpointAppServicesMock.savedObjects.createInternalUnscopedSoClient() as jest.Mocked<SavedObjectsClientContract>
    );

    scriptsClient = new ScriptsLibraryClient({
      spaceId: 'spaceA',
      username: 'elastic',
      endpointService: endpointAppServicesMock,
    });
  });

  describe('#create()', () => {
    let createBodyMock: CreateScriptRequestBody;

    beforeEach(() => {
      createBodyMock = ScriptsLibraryMock.generateCreateScriptBody();
    });

    it('should create a file record and upload file content to it', async () => {
      await scriptsClient.create(createBodyMock);

      expect(filesPluginClient.create).toHaveBeenCalledWith({
        id: expect.any(String),
        metadata: {
          mime: 'application/text',
          name: 'foo.txt',
        },
      });

      expect(fileMock.uploadContent).toHaveBeenCalledWith(expect.any(Readable), undefined, {
        transforms: [expect.any(Transform)],
      });
    });

    it('should create a new script entry in the library using same id as File storage', async () => {
      await scriptsClient.create(createBodyMock);
      const scriptId = filesPluginClient.create.mock.calls[0][0].id;

      expect(
        endpointAppServicesMock.savedObjects.createInternalUnscopedSoClient().create
      ).toHaveBeenCalledWith(
        SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE,
        {
          created_by: 'elastic',
          description: 'does some stuff',
          example: 'bash -c script_one.sh',
          executable: undefined,
          hash: 'e5441eb2bb',
          id: scriptId,
          instructions: 'just execute it',
          name: 'script one',
          platform: ['linux', 'macos'],
          requires_input: false,
          updated_by: 'elastic',
        },
        { id: scriptId }
      );
    });

    it('should delete the file record if upload of file content failed', async () => {
      fileMock.uploadContent.mockRejectedValue(new Error('upload failed'));

      await expect(scriptsClient.create(createBodyMock)).rejects.toThrow('upload failed');
      expect(fileMock.delete).toHaveBeenCalled();
    });

    it('should delete the file record if creating the script entry fails', async () => {
      (
        endpointAppServicesMock.savedObjects.createInternalUnscopedSoClient() as jest.Mocked<SavedObjectsClientContract>
      ).create.mockRejectedValue(new Error('Failed to create so record'));

      await expect(scriptsClient.create(createBodyMock)).rejects.toThrow(
        'Failed to create so record'
      );
      expect(fileMock.delete).toHaveBeenCalled();
    });

    it('should return the new Script record', async () => {
      await expect(scriptsClient.create(createBodyMock)).resolves.toEqual({
        createdAt: '2025-11-24T16:04:17.471Z',
        createdBy: 'elastic',
        downloadUri: '/api/endpoint/action/scripts_library/1-2-3/download',
        id: '1-2-3',
        name: 'my script',
        platform: ['macos', 'linux'],
        requiresInput: false,
        updatedAt: '2025-11-24T16:04:17.471Z',
        updatedBy: 'elastic',
        version: 'WzgsMV0=',
      });
    });
  });
});
