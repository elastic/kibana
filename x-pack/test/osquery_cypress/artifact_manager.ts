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

const archMap: { [key: string]: string } = {
  x64: 'x86_64',
};

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
    return;
  }
  log.info(`Fetching ${filename} from ${url}`);
  const agent = await axios(url as string, { responseType: 'arraybuffer' });
  writeFileSync(filename, agent.data);
  execSync(`tar xvf ${filename}`);
  return resolve(filename);
}

const fetchers = {
  'elastic-agent': getArtifact.bind(null, 'elastic-agent', (data, filename) =>
    get(data, ['build', 'projects', 'beats', 'packages', filename, 'url'])
  ),
  'fleet-server': getArtifact.bind(null, 'fleet-server', (data, filename) =>
    get(data, ['build', 'projects', 'fleet-server', 'packages', filename, 'url'])
  ),
};

export interface FetchArtifactsParams {
  'elastic-agent': string;
  'fleet-server': string;
}

export class ArtifactManager {
  private artifacts: { [artifactName: string]: string };
  private versions: FetchArtifactsParams;
  private log: ToolingLog;

  constructor(versions: FetchArtifactsParams, log: ToolingLog) {
    this.versions = versions;
    this.log = log;
    this.artifacts = {};
  }

  public fetchArtifacts = async () => {
    this.log.info('Fetching artifacts');
    await Promise.all(
      Object.keys(this.versions).map(async (artifactName) => {
        this.artifacts[artifactName] = await fetchers[artifactName](
          this.log,
          this.versions[artifactName]
        );
      })
    );
  };

  public getArtifactDirectory(artifactName: string) {
    const file = this.artifacts[artifactName];
    // this will break if the tarball name diverges from the directory that gets untarred
    return file.replace('.tar.gz', '');
  }

  public cleanupArtifacts = () => {
    this.log.info('Cleaning up artifacts');
    if (this.artifacts) {
      for (const artifactName of Object.keys(this.artifacts)) {
        unlinkSync(this.artifacts[artifactName]);
        rmdirSync(this.getArtifactDirectory(artifactName), { recursive: true });
      }
    }
  };
}
