/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { openSync, writeSync, unlinkSync, closeSync, statSync } from 'fs';
import JSON5 from 'json5';
import path from 'path';
import { promises as Fsp } from 'fs';
import { createHash } from 'crypto';
// @ts-expect-error we have to check types with "allowJs: false" for now, causing this import to fail
import { REPO_ROOT } from '@kbn/repo-info';
import chalk from 'chalk';

import Axios from 'axios';

// https://github.com/axios/axios/tree/ffea03453f77a8176c51554d5f6c3c6829294649/lib/adapters
// @ts-expect-error untyped internal module used to prevent axios from using xhr adapter in tests
import AxiosHttpAdapter from 'axios/lib/adapters/http';

function tryUnlink(pathToFile: string) {
  try {
    unlinkSync(pathToFile);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

export const PACKAGE_STORAGE_REGISTRY_URL = 'https://epr.elastic.co';

interface FleetPackage {
  name: string;
  version: string;
  forceAlignStackVersion?: boolean;
  allowSyncToPrerelease?: boolean;
}

export const downloadPackageFromFleet = async (bundledPackageDir: string, log: ToolingLog) => {
  const configFilePath = path.resolve(REPO_ROOT, 'fleet_packages.json');
  const fleetPackages = await Fsp.readFile(configFilePath, 'utf8');

  const parsedFleetPackages: FleetPackage[] = JSON5.parse(fleetPackages);

  const securityDetectionEnginePackage = parsedFleetPackages.find(
    (fleetPackage) => fleetPackage.name === 'security_detection_engine'
  );

  if (!securityDetectionEnginePackage) {
    throw new Error('Could not find security_detection_engine package');
  }

  const { name, version } = securityDetectionEnginePackage;

  const packagePath = `${name}-${version}.zip`;
  const archiveUrl = `${PACKAGE_STORAGE_REGISTRY_URL}/epr/${name}/${name}-${version}.zip`;

  const destination = path.resolve(bundledPackageDir, packagePath);

  try {
    await downloadToDisk({
      log,
      url: archiveUrl,
      destination,
      shaChecksum: '',
      shaAlgorithm: 'sha512',
      skipChecksumCheck: true,
      maxAttempts: 3,
    });
  } catch (error) {
    throw new Error(`Failed to download bundled package archive ${packagePath}: ${error.message}`);
  }

  return { version };
};

interface DownloadToDiskOptions {
  log: ToolingLog;
  url: string;
  destination: string;
  shaChecksum: string;
  shaAlgorithm: string;
  maxAttempts?: number;
  retryDelaySecMultiplier?: number;
  skipChecksumCheck?: boolean;
}
export async function downloadToDisk({
  log,
  url,
  destination,
  shaChecksum,
  shaAlgorithm,
  maxAttempts = 1,
  retryDelaySecMultiplier = 5,
  skipChecksumCheck = false,
}: DownloadToDiskOptions) {
  if (!shaChecksum && !skipChecksumCheck) {
    throw new Error(`${shaAlgorithm} checksum of ${url} not provided, refusing to download.`);
  }

  if (maxAttempts < 1) {
    throw new Error(`[maxAttempts=${maxAttempts}] must be >= 1`);
  }

  let attempt = 0;
  while (true) {
    attempt += 1;

    // mkdirp and open file outside of try/catch, we don't retry for those errors
    await Fsp.mkdir(path.dirname(destination), { recursive: true });
    const fileHandle = openSync(destination, 'w');

    let error;
    try {
      log.debug(
        `[${attempt}/${maxAttempts}] Attempting download of ${url}`,
        skipChecksumCheck ? '' : chalk.dim(shaAlgorithm)
      );

      const response = await Axios.request({
        url,
        responseType: 'stream',
        adapter: AxiosHttpAdapter,
      });

      if (response.status !== 200) {
        throw new Error(`Unexpected status code ${response.status} when downloading ${url}`);
      }

      const hash = createHash(shaAlgorithm);
      let bytesWritten = 0;

      await new Promise<void>((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          if (!skipChecksumCheck) {
            hash.update(chunk);
          }

          const bytes = writeSync(fileHandle, chunk);
          bytesWritten += bytes;
        });

        response.data.on('error', reject);
        response.data.on('end', () => {
          if (bytesWritten === 0) {
            return reject(new Error(`No bytes written when downloading ${url}`));
          }

          return resolve();
        });
      });

      if (!skipChecksumCheck) {
        const downloadedSha = hash.digest('hex');
        if (downloadedSha !== shaChecksum) {
          throw new Error(
            `Downloaded checksum ${downloadedSha} does not match the expected ${shaAlgorithm} checksum.`
          );
        }
      }
    } catch (_error) {
      error = _error;
    } finally {
      closeSync(fileHandle);

      const fileStats = statSync(destination);
      log.debug(`Downloaded ${fileStats.size} bytes to ${destination}`);
    }

    if (!error) {
      log.debug(`Downloaded ${url} ${skipChecksumCheck ? '' : 'and verified checksum'}`);
      return;
    }

    log.debug(`Download failed: ${error.message}`);

    // cleanup downloaded data and log error
    log.debug(`Deleting downloaded data at ${destination}`);
    tryUnlink(destination);

    // retry if we have retries left
    if (attempt < maxAttempts) {
      const sec = attempt * retryDelaySecMultiplier;
      log.info(`Retrying in ${sec} seconds`);
      setTimeout(() => {}, sec * 1000);
      continue;
    }

    throw error;
  }
}
