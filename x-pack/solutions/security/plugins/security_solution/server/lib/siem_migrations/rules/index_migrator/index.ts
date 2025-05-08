/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { RuleMigrationSpaceIndexMigrator } from './per_space';
import type { Adapters } from '../types';

export class RuleMigrationIndexMigrator {
  constructor(
    private ruleMigrationIndexAdapters: Adapters,
    private esClient: ElasticsearchClient,
    private logger: Logger
  ) {}

  private async getSpaceListForMigrations() {
    const rulesIndexPattern = this.ruleMigrationIndexAdapters.rules.name;
    const rulesIndicesAcrossSpaces = await this.esClient.indices.get({
      index: rulesIndexPattern,
      allow_no_indices: true,
    });

    const spaceList = Object.keys(rulesIndicesAcrossSpaces).map((index) => {
      const indexPatternPrefix = rulesIndexPattern.replace('-*', '');
      return index.replace(`${indexPatternPrefix}-`, '');
    });

    return spaceList;
  }

  async run() {
    this.logger.info('\n\n\nStarting index migration for rule migrations\n\n\n');
    const allSpaces = await this.getSpaceListForMigrations();
    if (allSpaces.length === 0) {
      this.logger.info('No spaces or index found for rule migration');
      return;
    }
    this.logger.info('Starting index migration for rule migrations');
    for (const spaceId of allSpaces) {
      const migrator = new RuleMigrationSpaceIndexMigrator(
        spaceId,
        this.esClient,
        this.logger,
        this.ruleMigrationIndexAdapters
      );
      await migrator.run();
    }
    this.logger.info('Finished index migration for rule migrations successfully');
  }
}
