/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  IScopedClusterClient,
  ElasticsearchClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import {
  getInstalledPackages,
  getPackages,
  bulkInstallPackages,
} from '@kbn/fleet-plugin/server/services/epm/packages';

interface PadPrecheckAndInstallClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
}

export class PadPrecheckAndInstallClient {
  private esClient: ElasticsearchClient;
  private soClient: SavedObjectsClientContract;

  constructor(private readonly opts: PadPrecheckAndInstallClientOpts) {
    this.esClient = opts.clusterClient.asCurrentUser;
    this.soClient = opts.soClient;
  }

  private log(level: Exclude<keyof Logger, 'get' | 'log' | 'isLevelEnabled'>, msg: string) {
    this.opts.logger[level](`[*** PADPCI ***][namespace: ${this.opts.namespace}] ${msg}`);
  }

  public async init() {
    this.log('info', `Initializing asset inventory`);
  }

  private async padPrecheck() {
    const { clusterClient, namespace } = this.opts;
    const esClient = clusterClient.asInternalUser;

    // Check if ML is enabled or not
    const mlInfo = await esClient.ml.info().catch((err) => {
      if (err?.body?.error?.type === 'x_pack_feature_disabled_exception') {
        this.log('debug', 'Machine Learning is disabled in Elasticsearch');
        return false;
      }
      throw err;
    });

    // If we successfully got ML info without error, ML is enabled
    const mlEnabled = mlInfo !== false;
    this.log('debug', `Machine Learning is ${mlEnabled ? 'enabled' : 'disabled'}`);

    // Check if the user has the required privileges to run ML jobs #TODO

    return {
      ml_enabled: mlEnabled,
      ml_privileges: {},
    };
  }
  private async padIntegrationPackageChecks() {
    const { clusterClient, namespace } = this.opts;
    const soClient = this.opts.soClient;
    const esClient = clusterClient.asInternalUser;
    const installedPackages = await getInstalledPackages({
      savedObjectsClient: soClient,
      esClient,
      perPage: 100,
      sortOrder: 'asc',
    });
    const padPackage = installedPackages.items.find((pkg) => pkg.name === 'pad');
    if (padPackage) {
      this.log(
        'debug',
        `PAD integration package version ${padPackage.version} is already installed with status: ${padPackage.status}`
      );
    } else {
      this.log('debug', `PAD integration package is not installed`);
      const availablePackages = await getPackages({
        savedObjectsClient: soClient,
        prerelease: true,
        category: 'security',
      });
      const availablePadPackage = availablePackages.find((pkg) => pkg.name === 'pad');
      if (!availablePadPackage) {
        this.log('debug', 'PAD integration package not found');
        // return { pad: { status: 'not_found', version: null } };
      }
      this.log('debug', `Found PAD integration package version: ${availablePadPackage?.version}`);
      this.log('debug', `Found PAD integration package name: ${availablePadPackage?.name}`);

      const bulkInstallResponse = await bulkInstallPackages({
        savedObjectsClient: soClient,
        packagesToInstall: [
          {
            name: availablePadPackage.name,
            version: availablePadPackage?.version,
            prerelease: true,
          },
        ],
        esClient,
        spaceId: namespace,
        skipIfInstalled: false,
        force: true,
      });
      this.log('debug', `Bulk install response: ${JSON.stringify(bulkInstallResponse, null, 2)}`);
    }
  }

  public async padPrecheckAndInstall() {
    const padChecks = await this.padPrecheck();
    await this.padIntegrationPackageChecks();
    const response = [];
    // return pad_checks;
    // WIP
  }
}
