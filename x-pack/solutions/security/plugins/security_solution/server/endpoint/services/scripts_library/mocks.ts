/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { createFileClientMock, createFileMock } from '@kbn/files-plugin/server/mocks';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ScriptsLibrarySavedObjectAttributes, ScriptsLibraryClientInterface } from './types';
import { SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE } from '../../lib/scripts_library';
import { createHapiReadableStreamMock } from '../actions/mocks';
import type {
  CreateScriptRequestBody,
  ListScriptsRequestQuery,
  PatchUpdateRequestBody,
} from '../../../../common/api/endpoint/scripts_library';
import {
  ENDPOINT_DEFAULT_PAGE_SIZE,
  SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE,
} from '../../../../common/endpoint/constants';
import type { EndpointScript } from '../../../../common/endpoint/types';

const generateScriptEntryMock = (overrides: Partial<EndpointScript> = {}): EndpointScript => {
  return {
    id: '1-2-3',
    name: 'script one',
    platform: ['linux', 'macos'],
    tags: ['dataCollection'],
    fileId: 'file-1-2-3',
    fileName: 'my_script.sh',
    fileSize: 12098,
    fileHash: 'e5441eb2bb',
    requiresInput: false,
    downloadUri: SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE.replace('{script_id}', '1-2-3'),
    description: 'does some stuff',
    instructions: 'just execute it',
    example: 'bash -c script_one.sh',
    pathToExecutable: undefined,
    createdBy: 'elastic',
    createdAt: '2025-11-20T14:15:09.900Z',
    updatedBy: 'admin',
    updatedAt: '2025-11-21T14:37:07.903Z',
    version: 'soVersionHere==',
    ...overrides,
  };
};

const generateCreateScriptBodyMock = (
  overrides: Partial<CreateScriptRequestBody> = {}
): CreateScriptRequestBody => {
  return {
    name: 'script one',
    platform: ['linux', 'macos'],
    description: 'does some stuff',
    instructions: 'just execute it',
    example: 'bash -c script_one.sh',
    requiresInput: false,
    tags: ['dataCollection'],
    file: createHapiReadableStreamMock(),
    ...overrides,
  };
};

const generateUpdateScriptBodyMock = (
  overrides: Partial<PatchUpdateRequestBody> = {}
): PatchUpdateRequestBody => {
  return {
    ...generateCreateScriptBodyMock(),
    version: 'soVersionHere==',
    ...overrides,
  };
};

const generateSavedObjectScriptEntryMock = (
  scriptEntrySoAttributeOverrides: Partial<ScriptsLibrarySavedObjectAttributes> = {}
): SavedObject<ScriptsLibrarySavedObjectAttributes> => {
  return {
    type: SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE,
    id: '1-2-3',
    namespaces: ['default'],
    attributes: {
      id: '1-2-3',
      file_id: 'file-1-2-3',
      file_size: 12098,
      file_name: 'my_script.sh',
      file_hash_sha256: 'e5441eb2bb',
      name: 'my script',
      platform: ['macos', 'linux'],
      requires_input: undefined,
      description: undefined,
      instructions: undefined,
      example: undefined,
      path_to_executable: undefined,
      created_by: 'elastic',
      created_at: '2025-11-24T16:04:17.471Z',
      updated_by: 'elastic',
      updated_at: '2025-11-24T16:04:17.471Z',
      ...scriptEntrySoAttributeOverrides,
    },
    references: [],
    managed: false,
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '10.1.0',
    updated_at: '2025-11-24T16:04:17.471Z',
    created_at: '2025-11-24T16:04:17.471Z',
    version: 'WzgsMV0=',
  };
};

const getScriptsLibraryClientMock = (): jest.Mocked<ScriptsLibraryClientInterface> => {
  return {
    create: jest.fn().mockResolvedValue(generateScriptEntryMock()),
    update: jest.fn().mockResolvedValue(generateScriptEntryMock()),
    get: jest.fn().mockResolvedValue(generateScriptEntryMock()),
    list: jest.fn(
      async ({
        page = 1,
        pageSize = ENDPOINT_DEFAULT_PAGE_SIZE,
        sortField = 'name',
        sortDirection = 'asc',
      }: ListScriptsRequestQuery = {}) => {
        return {
          data: [generateScriptEntryMock()],
          total: 1,
          page,
          pageSize,
          sortField,
          sortDirection,
        };
      }
    ),
    delete: jest.fn().mockResolvedValue(null),
    download: jest.fn(async (_) => {
      return {
        stream: Readable.from(['test']),
        fileName: 'do_something.sh',
        mimeType: 'application/something',
      };
    }),
  };
};

const createFilesPluginClientMock = <Meta = unknown>(
  fileDataOverride: Partial<FileJSON<Meta>> = {}
): {
  client: ReturnType<typeof createFileClientMock>;
  file: ReturnType<typeof createFileMock>;
} => {
  const file = createFileMock(fileDataOverride);
  const client = createFileClientMock<Meta>();

  file.update.mockImplementation(async (attr) => {
    Object.assign(file.data, attr);
    return file;
  });
  file.uploadContent.mockResolvedValue(file);
  file.delete.mockResolvedValue(undefined);

  client.create.mockResolvedValue(file);
  client.get.mockResolvedValue(file);
  client.update.mockResolvedValue(undefined);
  client.delete.mockResolvedValue(undefined);

  return { file, client };
};

const applySoClientMocks = (soClient: jest.Mocked<SavedObjectsClientContract>): void => {
  const scriptSoEntryMock = generateSavedObjectScriptEntryMock();

  soClient.create.mockResolvedValue(scriptSoEntryMock);
  soClient.get.mockResolvedValue(scriptSoEntryMock);
  soClient.update.mockResolvedValue(scriptSoEntryMock);
  soClient.find.mockResolvedValue({
    page: 0,
    per_page: 0,
    total: 0,
    saved_objects: [{ ...scriptSoEntryMock, score: 1 }],
  });
};

export const ScriptsLibraryMock = Object.freeze({
  getMockedClient: getScriptsLibraryClientMock,
  generateScriptEntry: generateScriptEntryMock,
  generateCreateScriptBody: generateCreateScriptBodyMock,
  generateUpdateScriptBody: generateUpdateScriptBodyMock,
  generateSavedObjectScriptEntry: generateSavedObjectScriptEntryMock,
  createFilesPluginClient: createFilesPluginClientMock,
  applyMocksToSoClient: applySoClientMocks,
});
