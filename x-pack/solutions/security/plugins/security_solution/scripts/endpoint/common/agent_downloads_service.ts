/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import { mkdir, readdir, stat, unlink, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import fs from 'fs';
import { createHash } from 'crypto';
import { finished } from 'stream/promises';
import { Readable } from 'stream';
import type { ReadableStream as WebReadableStream } from 'stream/web';
import type { ReadStream } from 'fs';
import type { ToolingLog } from '@kbn/tooling-log';
import { handleProcessInterruptions } from './nodejs_utils';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { SettingsStorage } from './settings_storage';

const DOWNLOAD_LOCK_WAIT_MS = 10 * 60 * 1000;
const DOWNLOAD_LOCK_POLL_MS = 500;

interface DownloadLockOptions {
  /** How long to wait for a live or unwritten lock before failing. */
  waitMs?: number;
  /** Delay between checks while waiting. */
  pollMs?: number;
}

/** Positive integer pid. Empty or non-numeric text means the owner is still writing the file. */
const readLockPid = (ownerText: string): number | undefined => {
  const trimmed = ownerText.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return undefined;
  }
  return Number(trimmed);
};

const isProcessAlive = (pid: number): boolean => {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
};

const isEnoent = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === 'ENOENT';

/** `undefined` means the lock disappeared and the caller should try to create it again. */
const readDownloadLock = (lockPath: string): string | undefined => {
  try {
    return fs.readFileSync(lockPath, 'utf8');
  } catch (error) {
    if (isEnoent(error)) {
      return undefined;
    }
    throw error;
  }
};

/**
 * Take the lock file aside and delete it only when it still names `expectedOwner`.
 * A replacement created by another worker stays at `lockPath`.
 */
const removeStaleDownloadLock = (lockPath: string, expectedOwner: string): void => {
  const heldAside = `${lockPath}.${process.pid}.${Date.now()}.stale`;

  try {
    fs.renameSync(lockPath, heldAside);
  } catch (error) {
    if (isEnoent(error)) {
      return;
    }
    throw error;
  }

  const contents = readDownloadLock(heldAside);
  if (contents === undefined || contents.trim() === expectedOwner.trim()) {
    fs.rmSync(heldAside, { force: true });
    return;
  }

  // `link` fails with EEXIST when the destination exists. `rename` would replace it.
  try {
    fs.linkSync(heldAside, lockPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      fs.rmSync(heldAside, { force: true });
      return;
    }
    throw error;
  }
  fs.rmSync(heldAside, { force: true });
};

const releaseDownloadLock = (lockPath: string): void => {
  if (readDownloadLock(lockPath) === String(process.pid)) {
    fs.rmSync(lockPath, { force: true });
  }
};

/**
 * One shared tarball path is used by every worker. Hold an exclusive lock so a
 * second download does not truncate or delete the file the first one is writing.
 */
export const withDownloadLock = async <T>(
  log: ToolingLog,
  lockPath: string,
  run: () => Promise<T>,
  options?: DownloadLockOptions
): Promise<T> => {
  const started = Date.now();
  const waitMs = options?.waitMs ?? DOWNLOAD_LOCK_WAIT_MS;
  const pollMs = options?.pollMs ?? DOWNLOAD_LOCK_POLL_MS;
  let reportedWait = false;

  while (true) {
    try {
      fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }

      const ownerText = readDownloadLock(lockPath);
      if (ownerText !== undefined) {
        const owner = readLockPid(ownerText);
        if (owner !== undefined && !isProcessAlive(owner)) {
          removeStaleDownloadLock(lockPath, ownerText);
        } else {
          if (!reportedWait) {
            reportedWait = true;
            log.info(
              owner === undefined
                ? 'Waiting for agent download lock contents to be written'
                : `Waiting for agent download lock held by pid ${owner}`
            );
          }

          if (Date.now() - started >= waitMs) {
            throw new Error(`Timed out waiting for agent download lock [${lockPath}]`);
          }

          await new Promise((resolve) => setTimeout(resolve, pollMs));
        }
      }
    }
  }

  try {
    return await run();
  } finally {
    releaseDownloadLock(lockPath);
  }
};

/**
 * Fetches the expected SHA512 hash from the artifacts API sha_url endpoint.
 * The response is a text file in the format: "<hash>  <filename>"
 */
export const fetchExpectedHash = async (shaUrl: string): Promise<string> => {
  const response = await fetch(shaUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch hash from ${shaUrl}: ${response.status} ${response.statusText}`
    );
  }
  const text = await response.text();
  // Format is "<hash>  <filename>" — extract just the hash
  return text.trim().split(/\s+/)[0];
};

/**
 * Computes the SHA512 hash of a local file using streaming.
 */
export const computeFileHash = async (filePath: string): Promise<string> => {
  const hash = createHash('sha512');
  const stream: ReadStream = fs.createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  return hash.digest('hex');
};

export interface DownloadedAgentInfo {
  filename: string;
  /** The local directory where downloads are stored */
  directory: string;
  /** The full local file path and name */
  fullFilePath: string;
}

interface AgentDownloadStorageSettings {
  /**
   * Last time a cleanup was performed. Date in ISO format
   */
  lastCleanup: string;

  /**
   * The max file age in milliseconds. Defaults to 2 days
   */
  maxFileAge: number;
}

/**
 * Class for managing Agent Downloads on the local disk
 * @internal
 */
class AgentDownloadStorage extends SettingsStorage<AgentDownloadStorageSettings> {
  private downloadsFolderExists = false;
  private readonly downloadsDirName = 'agent_download_storage';
  private readonly downloadsDirFullPath: string;
  private readonly log = createToolingLogger();

  constructor() {
    super('agent_download_storage_settings.json', {
      defaultSettings: {
        maxFileAge: 1.728e8, // 2 days in milliseconds
        lastCleanup: new Date().toISOString(),
      },
    });

    this.downloadsDirFullPath = this.buildPath(this.downloadsDirName);
  }

  /**
   * Ensures the download directory exists on disk
   */
  protected async ensureExists(): Promise<void> {
    await super.ensureExists();

    if (!this.downloadsFolderExists) {
      await mkdir(this.downloadsDirFullPath, { recursive: true });
      this.log.debug(`Created directory [${this.downloadsDirFullPath}] for cached agent downloads`);
      this.downloadsFolderExists = true;
    }
  }

  /**
   * Gets the file paths for a given download URL and optional file name.
   */
  public getPathsForUrl(agentDownloadUrl: string, agentFileName?: string): DownloadedAgentInfo {
    const filename =
      agentFileName || agentDownloadUrl.replace(/^https?:\/\//gi, '').replace(/\//g, '#');
    const directory = this.downloadsDirFullPath;
    const fullFilePath = this.buildPath(join(this.downloadsDirName, filename));

    return {
      filename,
      directory,
      fullFilePath,
    };
  }

  /**
   * Downloads the agent and stores it locally. Reuses existing downloads if available.
   * When shaUrl is provided, validates file integrity using SHA512 hash.
   */
  public async downloadAndStore(
    agentDownloadUrl: string,
    agentFileName?: string,
    shaUrl?: string
  ): Promise<DownloadedAgentInfo> {
    await this.ensureExists();
    const downloadInfo = this.getPathsForUrl(agentDownloadUrl, agentFileName);
    return withDownloadLock(this.log, `${downloadInfo.fullFilePath}.lock`, () =>
      this.downloadAndStoreUnlocked(agentDownloadUrl, agentFileName, shaUrl)
    );
  }

  private async downloadAndStoreUnlocked(
    agentDownloadUrl: string,
    agentFileName?: string,
    shaUrl?: string
  ): Promise<DownloadedAgentInfo> {
    this.log.debug(`Starting download: ${agentDownloadUrl}`);

    await this.ensureExists();
    const newDownloadInfo = this.getPathsForUrl(agentDownloadUrl, agentFileName);
    const sidecarPath = `${newDownloadInfo.fullFilePath}.sha512`;

    // Check cached version with integrity validation
    if (fs.existsSync(newDownloadInfo.fullFilePath)) {
      if (fs.existsSync(sidecarPath)) {
        try {
          const expectedHash = (await readFile(sidecarPath, 'utf-8')).trim();
          const actualHash = await computeFileHash(newDownloadInfo.fullFilePath);
          if (expectedHash === actualHash) {
            this.log.debug(
              `Download already cached and verified at [${newDownloadInfo.fullFilePath}]`
            );
            return newDownloadInfo;
          }
          this.log.error(
            `Cached file integrity check failed for [${newDownloadInfo.fullFilePath}] — expected ${expectedHash}, got ${actualHash}. Re-downloading.`
          );
        } catch (error) {
          this.log.error(
            `Error validating cached file: ${(error as Error).message}. Re-downloading.`
          );
        }
      } else {
        this.log.info(
          `Cached file [${newDownloadInfo.fullFilePath}] has no sidecar hash file. Re-downloading to ensure integrity.`
        );
      }
      // Delete corrupt/unverifiable cached file and sidecar
      await this.deleteCachedFileAndSidecar(newDownloadInfo.fullFilePath, sidecarPath);
    }

    // Fetch expected hash (best-effort)
    let expectedHash: string | undefined;
    if (shaUrl) {
      try {
        expectedHash = await fetchExpectedHash(shaUrl);
      } catch (error) {
        this.log.warning(
          `Failed to fetch SHA512 hash from [${shaUrl}]: ${
            (error as Error).message
          }. Proceeding without integrity validation.`
        );
      }
    }

    let downloadedFileHash: string | undefined;

    try {
      await pRetry(
        async (attempt) => {
          this.log.info(
            `Attempt ${attempt} - Downloading agent from [${agentDownloadUrl}] to [${newDownloadInfo.fullFilePath}]`
          );
          const outputStream = fs.createWriteStream(newDownloadInfo.fullFilePath);

          await handleProcessInterruptions(
            async () => {
              try {
                const response = await fetch(agentDownloadUrl);
                if (!response.ok || !response.body) {
                  throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
                }
                const nodeStream = Readable.fromWeb(response.body as WebReadableStream);
                await finished(nodeStream.pipe(outputStream));
              } catch (error) {
                this.log.error(
                  `Error during download attempt ${attempt}: ${(error as Error).message}`
                );
                throw error;
              }
            },
            // `exit` listeners that throw are fatal. The file may already be gone
            // when another worker cleaned up the same shared download path.
            () => {
              fs.rmSync(newDownloadInfo.fullFilePath, { force: true });
            }
          );

          // Validate hash after download
          const actualHash = await computeFileHash(newDownloadInfo.fullFilePath);
          if (expectedHash) {
            if (expectedHash !== actualHash) {
              throw new Error(
                `Integrity check failed: expected SHA512 ${expectedHash}, got ${actualHash}`
              );
            }
            this.log.info(`SHA512 integrity check passed for [${newDownloadInfo.fullFilePath}]`);
          }

          // Store computed hash for sidecar (use remote hash if available, otherwise local)
          downloadedFileHash = expectedHash || actualHash;

          this.log.info(`Successfully downloaded agent to [${newDownloadInfo.fullFilePath}]`);
        },
        {
          retries: 2, // 2 retries = 3 total attempts (1 initial + 2 retries)
          onFailedAttempt: async (error) => {
            this.log.error(`Download attempt ${error.attemptNumber} failed: ${error.message}`);
            await unlink(newDownloadInfo.fullFilePath).catch(() => undefined);
          },
        }
      );
    } catch (error) {
      throw new Error(`Download failed after multiple attempts: ${(error as Error).message}`);
    }

    // Write sidecar hash file (always write — use remote hash if available, otherwise local)
    if (downloadedFileHash) {
      await writeFile(sidecarPath, downloadedFileHash, 'utf-8');
    }

    await this.cleanupDownloads();
    return newDownloadInfo;
  }

  private async deleteCachedFileAndSidecar(filePath: string, sidecarPath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch {
      // Ignore if already deleted
    }
    try {
      await unlink(sidecarPath);
    } catch {
      // Ignore if sidecar doesn't exist
    }
  }

  public async cleanupDownloads(): Promise<{ deleted: string[] }> {
    this.log.debug('Performing cleanup of cached Agent downloads');

    const settings = await this.get();
    const maxAgeDate = new Date(Date.now() - settings.maxFileAge);
    const response: { deleted: string[] } = { deleted: [] };

    if (settings.lastCleanup > maxAgeDate.toISOString()) {
      this.log.debug('Skipping cleanup, as it was performed recently.');
      return response;
    }

    await this.save({
      ...settings,
      lastCleanup: new Date().toISOString(),
    });

    try {
      const allFiles = await readdir(this.downloadsDirFullPath);
      const deleteFilePromises = allFiles.map(async (fileName) => {
        // Skip sidecar files — they'll be cleaned up with their parent tarball
        if (fileName.endsWith('.sha512')) {
          return;
        }
        const filePath = join(this.downloadsDirFullPath, fileName);
        const fileStats = await stat(filePath);
        if (fileStats.isFile() && fileStats.birthtime < maxAgeDate) {
          try {
            await unlink(filePath);
            response.deleted.push(filePath);
            // Also delete the sidecar hash file if it exists
            const sidecarPath = `${filePath}.sha512`;
            await unlink(sidecarPath).catch(() => {});
          } catch (err) {
            this.log.error(`Failed to delete file [${filePath}]: ${(err as Error).message}`);
          }
        }
      });

      await Promise.allSettled(deleteFilePromises);
      this.log.debug(`Deleted ${response.deleted.length} file(s)`);
      return response;
    } catch (err) {
      this.log.error(`Error during cleanup: ${(err as Error).message}`);
      return response;
    }
  }

  /**
   * Checks if a specific agent download is available locally.
   * Returns undefined if the file exists but has no sidecar hash file (unverifiable).
   */
  public isAgentDownloadFromDiskAvailable(filename: string): DownloadedAgentInfo | undefined {
    const filePath = join(this.downloadsDirFullPath, filename);
    if (fs.existsSync(filePath)) {
      const sidecarPath = `${filePath}.sha512`;
      if (!fs.existsSync(sidecarPath)) {
        this.log.info(
          `Cached file [${filePath}] has no sidecar hash file — treating as unavailable to force re-download with validation.`
        );
        return undefined;
      }
      return {
        filename,
        directory: this.downloadsDirFullPath,
        fullFilePath: filePath,
      };
    }
  }
}

export const agentDownloadsClient = new AgentDownloadStorage();

export interface DownloadAndStoreAgentResponse extends DownloadedAgentInfo {
  url: string;
}

/**
 * Downloads the agent file provided via the input URL to a local folder on disk. If the file
 * already exists on disk, then no download is actually done - the information about the cached
 * version is returned instead.
 * When shaUrl is provided, validates file integrity using SHA512 hash.
 * @param agentDownloadUrl
 * @param agentFileName
 * @param shaUrl
 */
export const downloadAndStoreAgent = async (
  agentDownloadUrl: string,
  agentFileName?: string,
  shaUrl?: string
): Promise<DownloadAndStoreAgentResponse> => {
  const downloadedAgent = await agentDownloadsClient.downloadAndStore(
    agentDownloadUrl,
    agentFileName,
    shaUrl
  );

  return {
    url: agentDownloadUrl,
    ...downloadedAgent,
  };
};

/**
 * Cleans up old agent downloads on disk.
 */
export const cleanupDownloads = async (): ReturnType<AgentDownloadStorage['cleanupDownloads']> => {
  return agentDownloadsClient.cleanupDownloads();
};

/**
 * Checks if a specific agent download is available from disk.
 */
export const isAgentDownloadFromDiskAvailable = (
  fileName: string
): DownloadedAgentInfo | undefined => {
  return agentDownloadsClient.isAgentDownloadFromDiskAvailable(fileName);
};
