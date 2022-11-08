/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse } from 'axios';
import { get } from 'lodash';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, rmdirSync } from 'fs';
import { resolve } from 'path';
import { ToolingLog } from '@kbn/dev-utils';
import { Manager } from './resource_manager';

const archMap: { [key: string]: string } = {
  x64: 'x86_64',
};

type ArtifactName = 'elastic-agent' | 'fleet-server';

async function getArtifact(
  artifact: string,
  urlExtractor: (data: AxiosResponse<any>, filename: string) => string,
  log: ToolingLog,
  version: string
) {
  log.info(`Fetching ${version} of ${artifact}`);
  const agents = await axios(
    `https://artifacts-api.elastic.co/v1/versions/${version}/builds/latest`
  );
  const arch = archMap[process.arch] ?? process.arch;
  const dirName = `${artifact}-${version}-${process.platform}-${arch}`;
  const filename = dirName + '.tar.gz';
  const url = urlExtractor(agents.data, filename);
  if (!url) {
    log.error(`Could not find url for ${artifact}:  ${url}`);
    throw new Error(`Unable to fetch ${artifact}`);
  }
  log.info(`Fetching ${filename} from ${url}`);
  const agent = await axios(url as string, { responseType: 'arraybuffer' });
  writeFileSync(filename, agent.data);
  execSync(`tar xvf ${filename}`);
  return resolve(filename);
}

// There has to be a better way to represent partial function application
type ArtifactFetcher = (
  log: Parameters<typeof getArtifact>[2],
  version: Parameters<typeof getArtifact>[3]
) => ReturnType<typeof getArtifact>;
type ArtifactFetchers = {
  [artifactName in ArtifactName]: ArtifactFetcher;
};

const fetchers: ArtifactFetchers = {
  'elastic-agent': getArtifact.bind(null, 'elastic-agent', (data, filename) =>
    get(data, ['build', 'projects', 'beats', 'packages', filename, 'url'])
  ),
  'fleet-server': getArtifact.bind(null, 'fleet-server', (data, filename) =>
    get(data, ['build', 'projects', 'fleet-server', 'packages', filename, 'url'])
  ),
};

export type FetchArtifactsParams = {
  [artifactName in ArtifactName]?: string;
};

type ArtifactPaths = FetchArtifactsParams;
export class ArtifactManager extends Manager {
  private artifacts: ArtifactPaths;
  private versions: FetchArtifactsParams;
  private log: ToolingLog;

  constructor(versions: FetchArtifactsParams, log: ToolingLog) {
    super();
    this.versions = versions;
    this.log = log;
    this.artifacts = {};
  }

  public fetchArtifacts = async () => {
    this.log.info('Fetching artifacts');
    await Promise.all(
      Object.keys(this.versions).map(async (name: string) => {
        const artifactName = name as ArtifactName;
        const version = this.versions[artifactName];
        if (!version) {
          this.log.warning(`No version is specified for ${artifactName}, skipping`);
          return;
        }
        const fetcher = fetchers[artifactName];
        if (!fetcher) {
          this.log.warning(`No fetcher is defined for ${artifactName}, skipping`);
        }

        this.artifacts[artifactName] = await fetcher(this.log, version);
      })
    );
  };

  public getArtifactDirectory(artifactName: string) {
    const file = this.artifacts[artifactName as ArtifactName];
    // this will break if the tarball name diverges from the directory that gets untarred
    if (!file) {
      throw new Error(`Unknown artifact ${artifactName}, unable to retreive directory`);
    }
    return file.replace('.tar.gz', '');
  }

  protected _cleanup() {
    this.log.info('Cleaning up artifacts');
    if (this.artifacts) {
      for (const artifactName of Object.keys(this.artifacts)) {
        const file = this.artifacts[artifactName as ArtifactName];
        if (!file) {
          this.log.warning(`Unknown artifact ${artifactName} encountered during cleanup, skipping`);
          continue;
        }
        unlinkSync(file);
        rmdirSync(this.getArtifactDirectory(artifactName), { recursive: true });
      }
    }
  }
}
