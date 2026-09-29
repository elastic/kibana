/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import {
  downloadAndStoreAgent,
  isAgentDownloadFromDiskAvailable,
  fetchExpectedHash,
  cleanupDownloads,
} from './agent_downloads_service';
import fs from 'fs';
import { readFile, readdir, stat, unlink, writeFile } from 'fs/promises';

const mockedFetch = vi.spyOn(global, 'fetch');
const mockDigest = vi.fn();

vi.mock('fs');
vi.mock('fs/promises', () => {
  const mocked = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    stat: vi.fn(),
    unlink: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('stream/promises', () => {
  const mocked = {
    finished: vi.fn().mockResolvedValue(undefined),
  };
  return { ...mocked, default: mocked };
});
vi.mock('stream', () => {
  const actual = require('stream');
  return {
    ...actual,
    Readable: {
      ...actual.Readable,
      fromWeb: vi.fn().mockReturnValue({
        pipe: vi.fn().mockReturnThis(),
      }),
    },
  };
});
vi.mock('crypto', () => {
  const mocked = {
    createHash: vi.fn(() => ({
      digest: mockDigest,
      update: vi.fn(),
    })),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../common/endpoint/data_loaders/utils', () => {
  const mocked = {
    createToolingLogger: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    })),
  };
  return { ...mocked, default: mocked };
});

const settingsJson = JSON.stringify({
  lastCleanup: new Date(0).toISOString(),
  maxFileAge: 1.728e8,
});

const url = 'http://example.com/agent.tar.gz';
const shaUrl = 'http://example.com/agent.tar.gz.sha512';
const fileName = 'elastic-agent-7.10.0.tar.gz';
const expectedHash = 'abc123def456';

const mockWriteStream = {
  on: vi.fn().mockReturnThis(),
  once: vi.fn().mockReturnThis(),
  emit: vi.fn().mockReturnThis(),
  end: vi.fn(),
  write: vi.fn().mockReturnValue(true),
  removeListener: vi.fn().mockReturnThis(),
  removeAllListeners: vi.fn().mockReturnThis(),
  writable: true,
};

/**
 * Helper to mock fs.existsSync based on file path patterns.
 * Returns a function that checks the path against the provided map.
 */
const mockExistsSync = (pathResults: Record<string, boolean>) => {
  (fs.existsSync as unknown as Mock).mockImplementation((path: string) => {
    for (const [pattern, result] of Object.entries(pathResults)) {
      if (path.includes(pattern)) return result;
    }
    return false;
  });
};

/**
 * Helper to mock readFile based on path patterns.
 */
const mockReadFile = (pathResults: Record<string, string>) => {
  (readFile as unknown as Mock).mockImplementation((path: string) => {
    for (const [pattern, result] of Object.entries(pathResults)) {
      if (path.includes(pattern)) return Promise.resolve(result);
    }
    return Promise.resolve(settingsJson);
  });
};

describe('AgentDownloadStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDigest.mockReturnValue(expectedHash);
    // Mock createReadStream used by computeFileHash — supports async iteration
    const mockReadStream = {
      async *[Symbol.asyncIterator]() {
        yield Buffer.from('mock-data');
      },
    };
    (fs.createReadStream as unknown as Mock).mockReturnValue(mockReadStream);
  });

  describe('downloadAndStoreAgent', () => {
    it('downloads and stores the agent if not cached', async () => {
      mockExistsSync({ [fileName]: false });
      (fs.createWriteStream as unknown as Mock).mockReturnValue(mockWriteStream);
      mockReadFile({});
      mockedFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: {},
      } as unknown as Response);

      const result = await downloadAndStoreAgent(url, fileName);

      expect(result).toEqual({
        url,
        filename: fileName,
        directory: expect.any(String),
        fullFilePath: expect.stringContaining(fileName),
      });
    });

    it('reuses cached agent when sidecar hash matches', async () => {
      mockExistsSync({ [fileName]: true, '.sha512': true });
      mockReadFile({ '.sha512': expectedHash });
      mockDigest.mockReturnValue(expectedHash);

      const result = await downloadAndStoreAgent(url, fileName);

      expect(result).toEqual({
        url,
        filename: fileName,
        directory: expect.any(String),
        fullFilePath: expect.stringContaining(fileName),
      });
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('re-downloads when cached file hash does not match sidecar', async () => {
      // First call: cache check finds file + sidecar. After delete, they're gone.
      let deleted = false;
      (fs.existsSync as unknown as Mock).mockImplementation((path: string) => {
        if (deleted) return false;
        if (path.includes(fileName) || path.includes('.sha512')) return true;
        return false;
      });
      (unlink as unknown as Mock).mockImplementation(() => {
        deleted = true;
        return Promise.resolve();
      });

      mockReadFile({ '.sha512': expectedHash });
      mockDigest.mockReturnValue('wrong_hash');
      (fs.createWriteStream as unknown as Mock).mockReturnValue(mockWriteStream);

      mockedFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: {},
      } as unknown as Response);

      const result = await downloadAndStoreAgent(url, fileName);

      expect(result).toEqual({
        url,
        filename: fileName,
        directory: expect.any(String),
        fullFilePath: expect.stringContaining(fileName),
      });
      expect(unlink).toHaveBeenCalled();
    });

    it('re-downloads when sidecar file is missing', async () => {
      let deleted = false;
      (fs.existsSync as unknown as Mock).mockImplementation((path: string) => {
        if (deleted) return false;
        if (path.includes('.sha512')) return false;
        if (path.includes(fileName)) return true;
        return false;
      });
      (unlink as unknown as Mock).mockImplementation(() => {
        deleted = true;
        return Promise.resolve();
      });
      (fs.createWriteStream as unknown as Mock).mockReturnValue(mockWriteStream);
      mockReadFile({});

      mockedFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: {},
      } as unknown as Response);

      const result = await downloadAndStoreAgent(url, fileName);

      expect(result).toEqual({
        url,
        filename: fileName,
        directory: expect.any(String),
        fullFilePath: expect.stringContaining(fileName),
      });
      expect(mockedFetch).toHaveBeenCalledWith(url);
    });

    it('validates hash after fresh download with shaUrl', async () => {
      mockExistsSync({ [fileName]: false });
      (fs.createWriteStream as unknown as Mock).mockReturnValue(mockWriteStream);
      mockDigest.mockReturnValue(expectedHash);
      mockReadFile({});

      mockedFetch
        .mockResolvedValueOnce({
          ok: true,
          text: vi.fn().mockResolvedValue(`${expectedHash}  agent.tar.gz`),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          body: {},
        } as unknown as Response);

      const result = await downloadAndStoreAgent(url, fileName, shaUrl);

      expect(result).toEqual({
        url,
        filename: fileName,
        directory: expect.any(String),
        fullFilePath: expect.stringContaining(fileName),
      });
      expect(mockedFetch).toHaveBeenCalledWith(shaUrl);
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.sha512'),
        expectedHash,
        'utf-8'
      );
    });

    it('throws after all retry attempts fail hash validation', async () => {
      mockExistsSync({ [fileName]: false });
      (fs.createWriteStream as unknown as Mock).mockReturnValue(mockWriteStream);
      mockDigest.mockReturnValue('wrong_hash_every_time');
      mockReadFile({});

      // sha_url fetch succeeds, all 3 download attempts produce wrong hash
      mockedFetch
        .mockResolvedValueOnce({
          ok: true,
          text: vi.fn().mockResolvedValue(`${expectedHash}  agent.tar.gz`),
        } as unknown as Response)
        .mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK',
          body: {},
        } as unknown as Response);

      await expect(downloadAndStoreAgent(url, fileName, shaUrl)).rejects.toThrow(
        /Integrity check failed/
      );
    });

    it('proceeds without validation when sha_url fetch fails but still writes local hash sidecar', async () => {
      mockExistsSync({ [fileName]: false });
      (fs.createWriteStream as unknown as Mock).mockReturnValue(mockWriteStream);
      mockReadFile({});
      mockDigest.mockReturnValue(expectedHash);

      mockedFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          body: {},
        } as unknown as Response);

      const result = await downloadAndStoreAgent(url, fileName, shaUrl);

      expect(result).toEqual({
        url,
        filename: fileName,
        directory: expect.any(String),
        fullFilePath: expect.stringContaining(fileName),
      });
      // Sidecar should be written with locally computed hash even when remote hash is unavailable
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.sha512'),
        expectedHash,
        'utf-8'
      );
    });
  });

  describe('isAgentDownloadFromDiskAvailable', () => {
    it('returns info when file and sidecar exist', () => {
      mockExistsSync({ [fileName]: true, '.sha512': true });

      const result = isAgentDownloadFromDiskAvailable(fileName);

      expect(result).toEqual({
        filename: fileName,
        directory: expect.any(String),
        fullFilePath: expect.stringContaining(fileName),
      });
    });

    it('returns undefined when file exists but sidecar is missing', () => {
      (fs.existsSync as unknown as Mock).mockImplementation((path: string) => {
        if (path.includes('.sha512')) return false;
        if (path.includes(fileName)) return true;
        return false;
      });

      const result = isAgentDownloadFromDiskAvailable(fileName);

      expect(result).toBeUndefined();
    });

    it('returns undefined when file does not exist', () => {
      mockExistsSync({ [fileName]: false });

      const result = isAgentDownloadFromDiskAvailable(fileName);

      expect(result).toBeUndefined();
    });
  });

  describe('cleanupDownloads', () => {
    it('deletes sidecar file alongside expired tarball', async () => {
      const oldDate = new Date(Date.now() - 1.728e8 - 1000); // older than maxFileAge

      // Settings with old lastCleanup to trigger cleanup
      const oldSettings = JSON.stringify({
        lastCleanup: new Date(0).toISOString(),
        maxFileAge: 1.728e8,
      });
      (readFile as unknown as Mock).mockResolvedValue(oldSettings);
      (readdir as unknown as Mock).mockResolvedValue([fileName, `${fileName}.sha512`]);
      (stat as unknown as Mock).mockResolvedValue({ isFile: () => true, birthtime: oldDate });
      (unlink as unknown as Mock).mockResolvedValue(undefined);
      (writeFile as unknown as Mock).mockResolvedValue(undefined);

      const result = await cleanupDownloads();

      // Should have deleted the tarball
      expect(result.deleted.length).toBe(1);
      expect(result.deleted[0]).toContain(fileName);
      // Should have also attempted to delete the sidecar
      const unlinkCalls = (unlink as unknown as Mock).mock.calls.map((call: string[]) => call[0]);
      expect(unlinkCalls.some((path: string) => path.endsWith('.sha512'))).toBe(true);
    });
  });

  describe('fetchExpectedHash', () => {
    it('parses hash from sha_url response', async () => {
      mockedFetch.mockResolvedValue({
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue(`${expectedHash}  elastic-agent-8.15.0-linux-x86_64.tar.gz`),
      } as unknown as Response);

      const hash = await fetchExpectedHash(shaUrl);
      expect(hash).toBe(expectedHash);
    });

    it('throws on non-ok response', async () => {
      mockedFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as unknown as Response);

      await expect(fetchExpectedHash(shaUrl)).rejects.toThrow('Failed to fetch hash');
    });
  });
});
