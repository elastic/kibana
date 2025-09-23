/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createVerify } from 'crypto';

import axios from 'axios';
import { cloneDeep } from 'lodash';
import AdmZip from 'adm-zip';
import type { ITelemetryReceiver } from './receiver';
import type { ESClusterInfo } from './types';

/**
 * Interface for managing artifact fetching and retrieval.
 *
 * Implementations must define how to start the service with a given telemetry receiver,
 * fetch individual artifacts by name, and provide the manifest URL in use.
 */
export interface IArtifact {
  start(receiver: ITelemetryReceiver): Promise<void>;
  getArtifact(name: string): Promise<Manifest>;
  getManifestUrl(): string | undefined;
}

/**
 * Describes the shape of an artifact manifest and its modification state.
 *
 * @property data - The actual manifest data, format depends on implementation.
 * @property notModified - Indicates whether the manifest data has changed since last retrieval.
 */
export interface Manifest {
  data: unknown;
  notModified: boolean;
}

/**
 * An entry in the manifest cache that stores the manifest and its associated ETag value.
 *
 * @property manifest - The Manifest object representing the artifact manifest data and status.
 * @property etag - The ETag string returned by the CDN for cache validation.
 */
interface CacheEntry {
  manifest: Manifest;
  etag: string;
}

/**
 * Configuration details for the CDN used to fetch artifacts.
 *
 * @property url - The base URL of the CDN for artifact downloads.
 * @property pubKey - The public key string used to verify artifact signatures.
 */
export interface CdnConfig {
  url: string;
  pubKey: string;
}

const DEFAULT_CDN_CONFIG: CdnConfig = {
  url: 'https://bankc-artifacts.sde.elastic.dev/6b29665c-d719-4d25-b990-5141e0d1afdf',
  pubKey: `
-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA7N74oODfq74jrF1RdxEu
dIeawpiImhbp9FQIzvgB/HAxiEynQG/B9mCsa02yBDlUwuE7t6d6fTIQOFXdxt08
wCOl93W3k7jMRAYgqQhteRp6phMonTF5nKM4FXuw3Ik1F+SHlzlJBskmKcowUzyp
9V8GwsCWZllrpGWsj2o6m+W6zZ34M24Y8lVkT8nlvNU0ZRh71klwOrkZX/vtl63v
kHpIiSQfiik+WraswEu7plXNx4UsLkKGSqtvo0Wn52XBnG+dh9e08bC4lq2kWSlI
2N2Aj+PLQ3hwLIW2/saqb9e42UGuJcO/+EwFFJaXKCUaNrMLU5U1G6J3xoKi0Shj
FMq5AH97AFNz0Y3qRoJB5ddwx+0jaSRaWw8ZhTKwGwLPteHjsVtKeheL1ESV2+u4
N0w8w2LbPxrccdajRayTydoc2FiHHtU2X7wYh8EuWtdaPlEVrWbQOhlPpgHScwSn
/9Q5D/xiq2QNg9iIfPCQnV+FK5EynCqTX3BYaCTGj6PBanXd50JlWHciAnXfHfdS
32bN0CR2Zo3J+2WL/RhACAj+doBdCKd0Rcrx4gax0AlYahIqmg7/N3Yr7u4Qy3nj
aHwClD0k6rqZ/LCjWjVggTHtXLSiAr3P2b8mJUosiyQVTh+wDAoktqMlNkJfNZRE
+pIPMpz/5lT5u05nQnL11JECAwEAAQ==
-----END PUBLIC KEY-----
`,
};

export class Artifact implements IArtifact {
  private manifestUrl?: string;
  private cdn?: CdnConfig;

  private readonly AXIOS_TIMEOUT_MS = 10_000;
  private receiver?: ITelemetryReceiver;
  private esClusterInfo?: ESClusterInfo;
  private cache: Map<string, CacheEntry> = new Map();

  public async start(receiver: ITelemetryReceiver, cdn: CdnConfig = DEFAULT_CDN_CONFIG) {
    this.receiver = receiver;
    this.esClusterInfo = await this.receiver.fetchClusterInfo();
    this.cdn = cdn;
    if (this.esClusterInfo?.version?.number) {
      const version =
        this.esClusterInfo.version.number.substring(
          0,
          this.esClusterInfo.version.number.indexOf('-')
        ) || this.esClusterInfo.version.number;
      this.manifestUrl = `${cdn.url}/downloads/kibana/manifest/artifacts-${version}.zip`;
    }
  }

  public async getArtifact(name: string): Promise<Manifest> {
    return axios
      .get(this.getManifestUrl(), {
        headers: this.headers(name),
        timeout: this.AXIOS_TIMEOUT_MS,
        validateStatus: (status) => status < 500,
        responseType: 'arraybuffer',
      })
      .then(async (response) => {
        switch (response.status) {
          case 200:
            const manifest = {
              data: await this.getManifest(name, response.data),
              notModified: false,
            };
            // only update etag if we got a valid manifest
            if (response.headers && response.headers.etag) {
              const cacheEntry = {
                manifest: { ...manifest, notModified: true },
                etag: response.headers?.etag ?? '',
              };
              this.cache.set(name, cacheEntry);
            }
            return cloneDeep(manifest);
          case 304:
            return cloneDeep(this.getCachedManifest(name));
          case 404:
            // just in case, remove the entry
            this.cache.delete(name);
            throw Error(`No manifest resource found at url: ${this.manifestUrl}`);
          default:
            throw Error(`Failed to download manifest, unexpected status code: ${response.status}`);
        }
      });
  }

  public getManifestUrl() {
    if (this.manifestUrl) {
      return this.manifestUrl;
    } else {
      throw Error(`No manifest url for version ${this.esClusterInfo?.version?.number}`);
    }
  }

  private getCachedManifest(name: string): Manifest {
    const entry = this.cache.get(name);
    if (!entry) {
      throw Error(`No cached manifest for name ${name}`);
    }
    return entry.manifest;
  }

  private async getManifest(name: string, data: Buffer): Promise<unknown> {
    const zip = new AdmZip(data);

    const manifestFile = zip.getEntries().find((entry) => {
      return entry.entryName === 'manifest.json';
    });

    const manifestSigFile = zip.getEntries().find((entry) => {
      return entry.entryName === 'manifest.sig';
    });

    if (!manifestFile) {
      throw Error('No manifest.json in artifact zip');
    }

    if (!manifestSigFile) {
      throw Error('No manifest.sig in artifact zip');
    }

    if (!this.isSignatureValid(manifestFile.getData(), manifestSigFile.getData())) {
      throw Error('Invalid manifest signature');
    }

    const manifest = JSON.parse(manifestFile.getData().toString());
    const relativeUrl = manifest.artifacts[name]?.relative_url;
    if (relativeUrl) {
      const url = `${this.cdn?.url}${relativeUrl}`;
      const artifactResponse = await axios.get(url, { timeout: this.AXIOS_TIMEOUT_MS });
      return artifactResponse.data;
    } else {
      throw Error(`No artifact for name ${name}`);
    }
  }

  // morre info https://www.rfc-editor.org/rfc/rfc9110#name-etag
  private headers(name: string): Record<string, string> {
    const etag = this.cache.get(name)?.etag;
    if (etag) {
      return { 'If-None-Match': etag };
    }
    return {};
  }

  private isSignatureValid(data: Buffer, signature: Buffer): boolean {
    if (!this.cdn) {
      throw Error('No CDN configuration provided');
    }

    const verifier = createVerify('RSA-SHA256');
    verifier.update(data);
    verifier.end();

    return verifier.verify(this.cdn.pubKey, signature);
  }
}

export const artifactService = new Artifact();
