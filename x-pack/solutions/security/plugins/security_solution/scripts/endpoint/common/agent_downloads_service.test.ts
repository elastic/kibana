/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// Adjust path if needed

import { downloadAndStoreAgent, isAgentDownloadFromDiskAvailable } from './agent_downloads_service';
import fs from 'fs';
import { finished } from 'stream/promises';

const mockedFetch = jest.spyOn(global, 'fetch');

jest.mock('fs');
jest.mock('stream/promises', () => ({
  finished: jest.fn(),
}));
jest.mock('../../../common/endpoint/data_loaders/utils', () => ({
  createToolingLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('AgentDownloadStorage', () => {
  const url = 'http://example.com/agent.tar.gz';
  const fileName = 'elastic-agent-7.10.0.tar.gz';
  beforeEach(() => {
    jest.clearAllMocks(); // Ensure no previous test state affects the current one
  });

  it('downloads and stores the agent if not cached', async () => {
    (fs.existsSync as unknown as jest.Mock).mockReturnValue(false);
    // Create a more complete mock WriteStream that supports pipe operations
    const mockWriteStream = {
      on: jest.fn().mockReturnThis(),
      once: jest.fn().mockReturnThis(),
      emit: jest.fn().mockReturnThis(),
      end: jest.fn(),
      write: jest.fn().mockReturnValue(true),
      removeListener: jest.fn().mockReturnThis(),
      removeAllListeners: jest.fn().mockReturnThis(),
      writable: true,
    };
    (fs.createWriteStream as unknown as jest.Mock).mockReturnValue(mockWriteStream);
    // Create a mock Response with all required properties
    // Using a plain object that satisfies the Response interface used by the code
    const mockBody = new ReadableStream();
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      body: mockBody,
    } as unknown as Response;
    mockedFetch.mockResolvedValue(mockResponse);
    (finished as unknown as jest.Mock).mockResolvedValue(undefined);

    const result = await downloadAndStoreAgent(url, fileName);

    expect(result).toEqual({
      url,
      filename: fileName,
      directory: expect.any(String),
      fullFilePath: expect.stringContaining(fileName), // Dynamically match the file path
    });
  });

  it('reuses cached agent if available', async () => {
    (fs.existsSync as unknown as jest.Mock).mockReturnValue(true);

    const result = await downloadAndStoreAgent(url, fileName);

    expect(result).toEqual({
      url,
      filename: fileName,
      directory: expect.any(String),
      fullFilePath: expect.stringContaining(fileName), // Dynamically match the path
    });
  });

  it('checks if agent download is available from disk', () => {
    (fs.existsSync as unknown as jest.Mock).mockReturnValue(true);

    const result = isAgentDownloadFromDiskAvailable(fileName);

    expect(result).toEqual({
      filename: fileName,
      directory: expect.any(String),
      fullFilePath: expect.stringContaining(fileName), // Dynamically match the path
    });
  });
});
