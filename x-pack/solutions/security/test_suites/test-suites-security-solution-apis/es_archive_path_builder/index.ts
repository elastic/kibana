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
  getPath(resourceUri: string): string {
    const archivePath = this.getEsArchivePathBasedOnEnv();
    return `${archivePath}/${resourceUri}`;
  }

  private getEsArchivePathBasedOnEnv(): string {
    return this.isServerless ? SERVERLESS_ES_ARCHIVE_PATH : ESS_ES_ARCHIVE_PATH;
  }
}
