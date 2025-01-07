/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import { mkdir, readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import fs from 'fs';
import nodeFetch from 'node-fetch';
import { finished } from 'stream/promises';
import { handleProcessInterruptions } from './nodejs_utils';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { SettingsStorage } from './settings_storage';

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
 * @private
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
   */
  public async downloadAndStore(
    agentDownloadUrl: string,
    agentFileName?: string
  ): Promise<DownloadedAgentInfo> {
    this.log.debug(`Starting download: ${agentDownloadUrl}`);

    await this.ensureExists();
    const newDownloadInfo = this.getPathsForUrl(agentDownloadUrl, agentFileName);

    // Return cached version if the file already exists
    if (fs.existsSync(newDownloadInfo.fullFilePath)) {
      this.log.debug(`Download already cached at [${newDownloadInfo.fullFilePath}]`);
      return newDownloadInfo;
    }

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
                const { body } = await nodeFetch(agentDownloadUrl);
                await finished(body.pipe(outputStream));
              } catch (error) {
                this.log.error(`Error during download attempt ${attempt}: ${error.message}`);
                // Ensure any errors here propagate and trigger retry
                throw error;
              }
            },
            () => fs.unlinkSync(newDownloadInfo.fullFilePath) // Clean up on interruption
          );
          this.log.info(`Successfully downloaded agent to [${newDownloadInfo.fullFilePath}]`);
        },
        {
          retries: 2, // 2 retries = 3 total attempts (1 initial + 2 retries)
          onFailedAttempt: (error) => {
            this.log.error(`Download attempt ${error.attemptNumber} failed: ${error.message}`);
            // Cleanup failed download
            return unlink(newDownloadInfo.fullFilePath);
          },
        }
      );
    } catch (error) {
      throw new Error(`Download failed after multiple attempts: ${error.message}`);
    }

    await this.cleanupDownloads();
    return newDownloadInfo;
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
        const filePath = join(this.downloadsDirFullPath, fileName);
        const fileStats = await stat(filePath);
        if (fileStats.isFile() && fileStats.birthtime < maxAgeDate) {
          try {
            await unlink(filePath);
            response.deleted.push(filePath);
          } catch (err) {
            this.log.error(`Failed to delete file [${filePath}]: ${err.message}`);
          }
        }
      });

      await Promise.allSettled(deleteFilePromises);
      this.log.debug(`Deleted ${response.deleted.length} file(s)`);
      return response;
    } catch (err) {
      this.log.error(`Error during cleanup: ${err.message}`);
      return response;
    }
  }

  /**
   * Checks if a specific agent download is available locally.
   */
  public isAgentDownloadFromDiskAvailable(filename: string): DownloadedAgentInfo | undefined {
    const filePath = join(this.downloadsDirFullPath, filename);
    if (fs.existsSync(filePath)) {
      return {
        filename,
        /** The local directory where downloads are stored */
        directory: this.downloadsDirFullPath,
        /** The full local file path and name */
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
 * version is returned instead
 * @param agentDownloadUrl
 * @param agentFileName
 */
export const downloadAndStoreAgent = async (
  agentDownloadUrl: string,
  agentFileName?: string
): Promise<DownloadAndStoreAgentResponse> => {
  const downloadedAgent = await agentDownloadsClient.downloadAndStore(
    agentDownloadUrl,
    agentFileName
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
