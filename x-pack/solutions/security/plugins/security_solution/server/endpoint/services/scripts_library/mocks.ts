/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE } from '../../../../common/endpoint/constants';
import type { EndpointScript } from '../../../../common/endpoint/types';
import type { ScriptsLibraryClientInterface } from './types';

const generateScriptEntryMock = (overrides: Partial<EndpointScript> = {}): EndpointScript => {
  return {
    id: '1-2-3',
    name: 'script one',
    platform: ['linux', 'macos'],
    requiresInput: false,
    downloadUri: SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE.replace('{script_id}', '1-2-3'),
    description: 'does some stuff',
    instructions: 'just execute it',
    example: 'bash -c script_one.sh',
    executable: undefined,
    createdBy: 'elastic',
    createdAt: '2025-11-20T14:15:09.900Z',
    updatedBy: 'admin',
    updatedAt: '2025-11-21T14:37:07.903Z',
    version: 'soVersionHere==',
    ...overrides,
  };
};

const getScriptsLibraryClientMock = (): jest.Mocked<ScriptsLibraryClientInterface> => {
  return {
    create: jest.fn().mockResolvedValue({ data: generateScriptEntryMock() }),
    update: jest.fn().mockResolvedValue({ data: generateScriptEntryMock() }),
    get: jest.fn().mockResolvedValue({ data: generateScriptEntryMock() }),
    list: jest.fn().mockResolvedValue({ data: [generateScriptEntryMock()] }),
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

export const ScriptsLibraryMock = Object.freeze({
  getMockedClient: getScriptsLibraryClientMock,
  generateScriptEntry: generateScriptEntryMock,
});
