/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVERLESS_ES_ARCHIVE_PATH, ESS_ES_ARCHIVE_PATH } from './constants';

export class EsArchivePathBuilder {
  constructor(private isServerless: boolean) {
    this.isServerless = isServerless;
  }

  /**
   * @param resourceUri represents the data type, e.g., auditbeat, and its associated index for hosts.
   * @returns the complete path based on the environment from which we intend to load the data.
   */

  /**
   * List of archives that have been relocated to the new path.
   * Add more archive prefixes as needed.
   */
  private static readonly RELOCATED_ARCHIVES = ['auditbeat', 'filebeat'];

  getPath(resourceUri: string): string {
    // Check if resourceUri matches any relocated archive prefix
    if (
      !this.isServerless &&
      EsArchivePathBuilder.RELOCATED_ARCHIVES.some((prefix) => resourceUri.startsWith(prefix))
    ) {
      return `x-pack/platform/test/fixtures/es_archives/${resourceUri}`;
    }
    const archivePath = this.getEsArchivePathBasedOnEnv();
    return `${archivePath}/${resourceUri}`;
  }

  private getEsArchivePathBasedOnEnv(): string {
    return this.isServerless ? SERVERLESS_ES_ARCHIVE_PATH : ESS_ES_ARCHIVE_PATH;
  }
}
