/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';

export type ElasticAgentPlatform = 'linux-x86_64' | 'windows-x86_64';

const getMinorLine = (version: string): string => {
  // Examples:
  // - 9.3.0-SNAPSHOT -> 9.3
  // - 9.3.0 -> 9.3
  const match = version.match(/^(\d+)\.(\d+)\.\d+/);
  if (!match) {
    throw new Error(`Unable to parse agent version: ${version}`);
  }
  return `${match[1]}.${match[2]}`;
};

const getSnapshotLatestJsonUrl = (minorLine: string): string =>
  `https://snapshots.elastic.co/latest/${minorLine}.json`;

const getSnapshotManifestUrl = async (version: string): Promise<string> => {
  const minorLine = getMinorLine(version);
  try {
    const { data } = await axios.get<{ manifest_url: string }>(
      getSnapshotLatestJsonUrl(minorLine),
      {
        timeout: 10_000,
      }
    );
    if (data?.manifest_url) {
      return data.manifest_url;
    }
  } catch (e) {
    // Fall through to DRA staging below
  }

  // Fallback: DRA staging (artifacts-staging.elastic.co) for versions not yet on snapshots.elastic.co
  const draLatestUrl = `https://artifacts-staging.elastic.co/dra/${minorLine}.json`;
  try {
    const { data } = await axios.get<{ manifest_url: string }>(draLatestUrl, {
      timeout: 10_000,
    });
    if (data?.manifest_url) {
      return data.manifest_url;
    }
  } catch {
    // Fall through to error
  }

  throw new Error(
    `Unable to find snapshot manifest for ${minorLine}. Tried:\n` +
      `  - ${getSnapshotLatestJsonUrl(minorLine)}\n` +
      `  - ${draLatestUrl}\n` +
      `Try specifying --version with an older available snapshot (e.g. the previous minor).`
  );
};

const getSnapshotAgentFilename = (version: string, platform: ElasticAgentPlatform): string => {
  const base = version.replace(/-SNAPSHOT$/, '-SNAPSHOT');
  switch (platform) {
    case 'linux-x86_64':
      return `elastic-agent-${base}-linux-x86_64.tar.gz`;
    case 'windows-x86_64':
      return `elastic-agent-${base}-windows-x86_64.zip`;
  }
};

const getReleaseAgentUrl = (version: string, platform: ElasticAgentPlatform): string => {
  switch (platform) {
    case 'linux-x86_64':
      return `https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${version}-linux-x86_64.tar.gz`;
    case 'windows-x86_64':
      return `https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${version}-windows-x86_64.zip`;
  }
};

export const resolveElasticAgentDownloadUrl = async (
  version: string,
  platform: ElasticAgentPlatform
): Promise<string> => {
  if (!version) {
    throw new Error(`Agent version is required`);
  }

  // Snapshot builds: resolve via snapshots manifest for the latest build of the minor line.
  if (/-SNAPSHOT$/.test(version)) {
    const manifestUrl = await getSnapshotManifestUrl(version);
    const filename = getSnapshotAgentFilename(version, platform);

    const { data } = await axios.get<any>(manifestUrl, { timeout: 20_000 });
    const url = data?.projects?.['elastic-agent-package']?.packages?.[filename]?.url;
    if (!url) {
      throw new Error(
        `Unable to find Elastic Agent package URL in snapshot manifest.\n` +
          `manifest: ${manifestUrl}\n` +
          `filename: ${filename}`
      );
    }
    return url as string;
  }

  // Release builds: use artifacts.elastic.co
  return getReleaseAgentUrl(version, platform);
};
