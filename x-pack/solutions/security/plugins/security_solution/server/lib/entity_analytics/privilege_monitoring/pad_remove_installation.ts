/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getInstalledPackages,
  removeInstallation,
} from '@kbn/fleet-plugin/server/services/epm/packages';

import type {
  Logger,
  IScopedClusterClient,
  ElasticsearchClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';

interface PadRemoveInstallationClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
}

export class PadRemoveInstallationClient {
  private esClient: ElasticsearchClient;
  private soClient: SavedObjectsClientContract;

  constructor(private readonly opts: PadRemoveInstallationClientOpts) {
    this.esClient = opts.clusterClient.asCurrentUser;
    this.soClient = opts.soClient;
  }

  private log(level: Exclude<keyof Logger, 'get' | 'log' | 'isLevelEnabled'>, msg: string) {
    this.opts.logger[level](`[PAD Remove Installation] [namespace: ${this.opts.namespace}] ${msg}`);
  }
  async removePadInstallation() {
    const installed = await getInstalledPackages({
      savedObjectsClient: this.soClient,
      esClient: this.esClient,
      perPage: 100,
      sortOrder: 'asc',
    });
    const padPackage = installed.items.find((pkg) => pkg.name === 'pad');
    if (!padPackage) {
      this.log('error', `PAD package not found`);
      return { status_code: 404, message: 'PAD package not installed' };
    }
    this.log(
      'debug',
      `Removing installation with name ${padPackage.name} and version ${padPackage.version}`
    );
    try {
      await removeInstallation({
        savedObjectsClient: this.soClient,
        esClient: this.esClient,
        pkgName: padPackage?.name,
        pkgVersion: padPackage?.version,
      });
      this.log(
        'info',
        `Successfully removed installation with name ${padPackage.name} and version ${padPackage.version}`
      );
      return { status_code: 200, message: 'PAD package removed successfully' };
    } catch (error) {
      this.log(
        'error',
        `Failed to remove installation with name ${padPackage.name} and version ${padPackage.version}: ${error}`
      );
      return {
        status_code: 500,
        message: `Failed to remove installation with name ${padPackage.name} and version ${padPackage.version}`,
        error,
      };
    }
  }
}
