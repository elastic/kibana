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
import { createHapiReadableStreamMock } from '../actions/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

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
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;
  let scriptsClient: ScriptsLibraryClientInterface;
  let filesPluginClient: ReturnType<typeof createFileClientMock>;
  let fileMock: ReturnType<typeof createFileMock>;

  beforeEach(async () => {
    endpointAppServicesMock = createMockEndpointAppContextService();

    soClientMock =
      endpointAppServicesMock.savedObjects.createInternalUnscopedSoClient() as jest.Mocked<SavedObjectsClientContract>;

    const filesPluginMocks = ScriptsLibraryMock.createFilesPluginClient({
      hash: { sha256: 'e5441eb2bb' },
    });

    filesPluginClient = filesPluginMocks.client;
    createEsFileClientMock.mockReturnValue(filesPluginClient);

    fileMock = filesPluginMocks.file;

    ScriptsLibraryMock.applyMocksToSoClient(soClientMock);

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
      soClientMock.find.mockResolvedValue({
        page: 0,
        per_page: 0,
        total: 0,
        saved_objects: [],
      });
    });

    it('should create a file record and upload file content to it', async () => {
      await scriptsClient.create(createBodyMock);
      const scriptSoId = (
        endpointAppServicesMock.savedObjects.createInternalUnscopedSoClient().create as jest.Mock
      ).mock.calls[0][2].id;

      expect(filesPluginClient.create).toHaveBeenCalledWith({
        metadata: {
          mime: 'application/text',
          name: 'foo.txt',
          meta: { scriptId: scriptSoId },
        },
      });

      expect(fileMock.uploadContent).toHaveBeenCalledWith(expect.any(Readable), undefined, {
        transforms: [expect.any(Transform)],
      });
    });

    it('should create a script entry (SO) with expected content', async () => {
      await scriptsClient.create(createBodyMock);
      const scriptSoId = soClientMock.create.mock.calls?.[0]?.[2]?.id;

      expect(
        endpointAppServicesMock.savedObjects.createInternalUnscopedSoClient().create
      ).toHaveBeenCalledWith(
        SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE,
        {
          description: 'does some stuff',
          example: 'bash -c script_one.sh',
          path_to_executable: undefined,
          file_hash_sha256: 'e5441eb2bb',
          file_id: '123',
          file_name: 'test.txt',
          file_size: 1234,
          id: scriptSoId,
          instructions: 'just execute it',
          name: 'script one',
          platform: ['linux', 'macos'],
          tags: ['dataCollection'],
          requires_input: false,
          created_by: 'elastic',
          created_at: expect.any(String),
          updated_by: 'elastic',
          updated_at: expect.any(String),
        },
        { id: scriptSoId }
      );
    });

    it('should delete the file record if upload of file content failed', async () => {
      fileMock.uploadContent.mockRejectedValue(new Error('upload failed'));

      await expect(scriptsClient.create(createBodyMock)).rejects.toThrow('upload failed');
      expect(fileMock.delete).toHaveBeenCalled();
    });

    it('should delete the file record if creating the script entry fails', async () => {
      soClientMock.create.mockRejectedValue(new Error('Failed to create so record'));

      await expect(scriptsClient.create(createBodyMock)).rejects.toThrow(
        'Failed to create so record'
      );
      expect(fileMock.delete).toHaveBeenCalled();
    });

    it('should validate that file hash does not already exist', async () => {
      soClientMock.find.mockResolvedValue({
        page: 1,
        per_page: 1,
        total: 1,
        saved_objects: [{ ...ScriptsLibraryMock.generateSavedObjectScriptEntry(), score: 1 }],
      });

      await expect(scriptsClient.create(createBodyMock)).rejects.toThrow(
        'The file you are attempting to upload (hash: [e5441eb2bb]) already exists and is associated with a script entry named [my script] (script ID: [1-2-3])'
      );
    });

    it('should return the new Script record', async () => {
      await expect(scriptsClient.create(createBodyMock)).resolves.toEqual({
        createdAt: '2025-11-24T16:04:17.471Z',
        createdBy: 'elastic',
        downloadUri: '/api/endpoint/scripts_library/1-2-3/download',
        id: '1-2-3',
        name: 'my script',
        fileHash: 'e5441eb2bb',
        fileId: 'file-1-2-3',
        fileName: 'my_script.sh',
        fileSize: 12098,
        platform: ['macos', 'linux'],
        requiresInput: false,
        tags: [],
        updatedAt: '2025-11-24T16:04:17.471Z',
        updatedBy: 'elastic',
        version: 'WzgsMV0=',
      });
    });
  });

  describe('#list()', () => {
    it('should use defaults when called with no options', async () => {
      await scriptsClient.list();

      expect(soClientMock.find).toHaveBeenCalledWith({
        filter: undefined,
        page: 1,
        perPage: 10,
        sortField: 'name',
        sortOrder: 'asc',
        type: SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE,
      });
    });

    it('should search for scripts using options provided on input', async () => {
      await scriptsClient.list({
        page: 101,
        pageSize: 500,
        sortField: 'createdAt',
        sortDirection: 'desc',
      });

      expect(soClientMock.find).toHaveBeenCalledWith({
        filter: undefined,
        page: 101,
        perPage: 500,
        sortField: 'created_at', // << Important: uses internal SO field name
        sortOrder: 'desc',
        type: SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE,
      });
    });

    it('should use a kuery with field names prefixed with SO type', async () => {
      await scriptsClient.list({
        kuery: 'name:script_one AND platform: (linux OR macos)',
      });

      expect(soClientMock.find).toHaveBeenCalledWith(
        expect.objectContaining({
          // The `kuery` passed to soClient.find() is converted to `KueryNode` (AST) and field names
          // prepended with the SO type
          filter: {
            arguments: [
              {
                arguments: [
                  {
                    isQuoted: false,
                    type: 'literal',
                    value: 'security:endpoint-scripts-library.attributes.name',
                  },
                  { isQuoted: false, type: 'literal', value: 'script_one' },
                ],
                function: 'is',
                type: 'function',
              },
              {
                arguments: [
                  {
                    arguments: [
                      {
                        isQuoted: false,
                        type: 'literal',
                        value: 'security:endpoint-scripts-library.attributes.platform',
                      },
                      { isQuoted: false, type: 'literal', value: 'linux' },
                    ],
                    function: 'is',
                    type: 'function',
                  },
                  {
                    arguments: [
                      {
                        isQuoted: false,
                        type: 'literal',
                        value: 'security:endpoint-scripts-library.attributes.platform',
                      },
                      { isQuoted: false, type: 'literal', value: 'macos' },
                    ],
                    function: 'is',
                    type: 'function',
                  },
                ],
                function: 'or',
                type: 'function',
              },
            ],
            function: 'and',
            type: 'function',
          },
        })
      );
    });

    it('should return expected response', async () => {
      await expect(scriptsClient.list()).resolves.toEqual({
        data: [
          {
            createdAt: '2025-11-24T16:04:17.471Z',
            createdBy: 'elastic',
            description: undefined,
            downloadUri: '/api/endpoint/scripts_library/1-2-3/download',
            example: undefined,
            id: '1-2-3',
            instructions: undefined,
            name: 'my script',
            fileHash: 'e5441eb2bb',
            fileId: 'file-1-2-3',
            fileName: 'my_script.sh',
            fileSize: 12098,
            pathToExecutable: undefined,
            platform: ['macos', 'linux'],
            tags: [],
            requiresInput: false,
            updatedAt: '2025-11-24T16:04:17.471Z',
            updatedBy: 'elastic',
            version: 'WzgsMV0=',
          },
        ],
        page: 1,
        pageSize: 10,
        sortDirection: 'asc',
        sortField: 'name',
        total: 0,
      });
    });
  });

  describe('#update()', () => {
    beforeEach(() => {
      ScriptsLibraryMock.applyMocksToSoClient(soClientMock);
    });

    it('should update script entry only when no file content is provided', async () => {
      await scriptsClient.update({
        id: '1-2-3',
        name: 'updated name',
        description: 'updated description',
      });

      expect(
        endpointAppServicesMock.savedObjects.createInternalUnscopedSoClient().update
      ).toHaveBeenCalledWith(
        SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE,
        '1-2-3',
        {
          name: 'updated name',
          description: 'updated description',
          updated_by: 'elastic',
          updated_at: expect.any(String),
        },
        { version: undefined }
      );

      expect(fileMock.uploadContent).not.toHaveBeenCalled();
    });

    it('should upload file content, update script with new file info and delete old file', async () => {
      soClientMock.find.mockResolvedValue({
        page: 0,
        per_page: 0,
        total: 0,
        saved_objects: [],
      });
      const fileContent = createHapiReadableStreamMock();
      await scriptsClient.update({
        id: '1-2-3',
        file: fileContent,
      });

      expect(fileMock.uploadContent).toHaveBeenCalledWith(fileContent, undefined, {
        transforms: [expect.any(Transform)],
      });

      expect(
        endpointAppServicesMock.savedObjects.createInternalUnscopedSoClient().update
      ).toHaveBeenCalledWith(
        SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE,
        '1-2-3',
        {
          file_hash_sha256: 'e5441eb2bb',
          file_id: '123',
          file_name: 'test.txt',
          file_size: 1234,
          updated_by: 'elastic',
          updated_at: expect.any(String),
        },
        { version: undefined }
      );

      expect(filesPluginClient.delete).toHaveBeenCalledWith({ id: 'file-1-2-3' });
    });

    it('should throw error when script does not exist', async () => {
      soClientMock.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());

      await expect(
        scriptsClient.update({
          id: 'non-existent',
          name: 'test',
        })
      ).rejects.toThrow('Script with id non-existent not found');
    });

    it('should throw error when uploading new file with `version` that is no longer valid', async () => {
      await expect(
        scriptsClient.update({
          id: '1-2-3',
          file: createHapiReadableStreamMock(),
          version: 'foo',
        })
      ).rejects.toThrow(
        'Script with id 1-2-3 has a different version than the one provided in the request. Current version: WzgsMV0=, provided version: foo'
      );
      expect(
        endpointAppServicesMock.savedObjects.createInternalUnscopedSoClient().update
      ).not.toHaveBeenCalled();
      expect(fileMock.uploadContent).not.toHaveBeenCalled();
    });

    it('should not update script entry if file upload fails', async () => {
      fileMock.uploadContent.mockRejectedValue(new Error('upload failed'));

      await expect(
        scriptsClient.update({
          id: '1-2-3',
          name: 'new name',
          file: createHapiReadableStreamMock(),
        })
      ).rejects.toThrow('upload failed');

      expect(
        endpointAppServicesMock.savedObjects.createInternalUnscopedSoClient().update
      ).not.toHaveBeenCalled();
    });

    it('should delete new uploaded file when update to script data fails', async () => {
      soClientMock.update.mockRejectedValue(new Error('Failed to update script record'));
      soClientMock.find.mockResolvedValue({
        page: 0,
        per_page: 0,
        total: 0,
        saved_objects: [],
      });

      await expect(
        scriptsClient.update({
          id: '1-2-3',
          file: createHapiReadableStreamMock(),
        })
      ).rejects.toThrow('Failed to update script record');

      expect(fileMock.delete).toHaveBeenCalled();
    });

    it('should validate that file hash does not already exist for another script', async () => {
      soClientMock.find.mockResolvedValue({
        page: 1,
        per_page: 1,
        total: 1,
        saved_objects: [{ ...ScriptsLibraryMock.generateSavedObjectScriptEntry(), score: 1 }],
      });

      await expect(
        scriptsClient.update({ id: '1-2-3', file: createHapiReadableStreamMock() })
      ).rejects.toThrow(
        'The file you are attempting to upload (hash: [e5441eb2bb]) already exists and is associated with a script entry named [my script] (script ID: [1-2-3])'
      );
    });

    it('should return script record on successful update', async () => {
      await expect(
        scriptsClient.update({
          id: '1-2-3',
          name: 'updated script',
        })
      ).resolves.toEqual({
        createdAt: '2025-11-24T16:04:17.471Z',
        createdBy: 'elastic',
        downloadUri: '/api/endpoint/scripts_library/1-2-3/download',
        id: '1-2-3',
        name: 'my script',
        fileHash: 'e5441eb2bb',
        fileId: 'file-1-2-3',
        fileName: 'my_script.sh',
        fileSize: 12098,
        platform: ['macos', 'linux'],
        tags: [],
        requiresInput: false,
        updatedAt: '2025-11-24T16:04:17.471Z',
        updatedBy: 'elastic',
        version: 'WzgsMV0=',
      });
    });
  });

  describe('#get()', () => {
    it('should retrieve script entry using ID provided', async () => {
      await scriptsClient.get('1-2-3');

      expect(
        endpointAppServicesMock.savedObjects.createInternalUnscopedSoClient().get
      ).toHaveBeenCalledWith(SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE, '1-2-3');
    });

    it('should respond with script', async () => {
      await expect(scriptsClient.get('1-2-3')).resolves.toEqual({
        createdAt: '2025-11-24T16:04:17.471Z',
        createdBy: 'elastic',
        downloadUri: '/api/endpoint/scripts_library/1-2-3/download',
        fileHash: 'e5441eb2bb',
        fileId: 'file-1-2-3',
        fileName: 'my_script.sh',
        fileSize: 12098,
        id: '1-2-3',
        name: 'my script',
        platform: ['macos', 'linux'],
        tags: [],
        requiresInput: false,
        updatedAt: '2025-11-24T16:04:17.471Z',
        updatedBy: 'elastic',
        version: 'WzgsMV0=',
      });
    });
  });

  describe('#download()', () => {
    it('should retrieve script metadata using ID provided', async () => {
      await scriptsClient.download('1-2-3');

      expect(
        endpointAppServicesMock.savedObjects.createInternalUnscopedSoClient().get
      ).toHaveBeenCalledWith(SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE, '1-2-3');
    });

    it('should retrieve file content using file ID from script metadata', async () => {
      await scriptsClient.download('1-2-3');

      expect(filesPluginClient.get).toHaveBeenCalledWith({ id: 'file-1-2-3' });
      expect(fileMock.downloadContent).toHaveBeenCalled();
    });

    it('should return script metadata and file stream', async () => {
      const result = await scriptsClient.download('1-2-3');

      expect(result).toEqual({
        stream: expect.any(Readable),
        fileName: 'my_script.sh',
        mimeType: 'text/plain',
      });
    });

    it('should throw error when script does not exist', async () => {
      soClientMock.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());

      await expect(scriptsClient.download('non-existent')).rejects.toThrow(
        'Script with id non-existent not found'
      );
    });
  });

  describe('#delete()', () => {
    it('should delete both script entry and associated file', async () => {
      await scriptsClient.delete('1-2-3');

      expect(
        endpointAppServicesMock.savedObjects.createInternalUnscopedSoClient().delete
      ).toHaveBeenCalledWith(SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE, '1-2-3');

      expect(filesPluginClient.delete).toHaveBeenCalledWith({ id: 'file-1-2-3' });
    });

    it('should return void on successful deletion', async () => {
      await expect(scriptsClient.delete('1-2-3')).resolves.toBeUndefined();
    });

    it('should throw error when script does not exist', async () => {
      soClientMock.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());

      await expect(scriptsClient.delete('non-existent')).rejects.toThrow(
        'Script with id non-existent not found'
      );
    });

    it('should complete successfully even if file deletion fails', async () => {
      filesPluginClient.delete.mockRejectedValue(new Error('file deletion failed'));

      await expect(scriptsClient.delete('1-2-3')).resolves.toBeUndefined();

      expect(
        endpointAppServicesMock.savedObjects.createInternalUnscopedSoClient().delete
      ).toHaveBeenCalledWith(SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE, '1-2-3');
    });
  });
});
