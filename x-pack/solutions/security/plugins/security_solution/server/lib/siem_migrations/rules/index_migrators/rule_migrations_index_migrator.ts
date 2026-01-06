/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { RuleMigrationSpaceIndexMigrator } from './rule_migrations_per_space_index_migrator';
import type { RuleMigrationAdapters } from '../types';

export class RuleMigrationIndexMigrator {
  constructor(
    private ruleMigrationIndexAdapters: RuleMigrationAdapters,
    private esClient: ElasticsearchClient,
    private logger: Logger
  ) {}

  private async getSpaceListForMigrations() {
    const rulesIndicesAcrossSpaces = await this.esClient.indices.get({
      index: this.ruleMigrationIndexAdapters.rules.getIndexName('*'),
      allow_no_indices: true,
    });

    const rulesIndexPatternPrefix = this.ruleMigrationIndexAdapters.rules.getIndexName('');
    const spaceList = Object.keys(rulesIndicesAcrossSpaces).map((index) => {
      return index.replace(rulesIndexPatternPrefix, '');
    });

    return spaceList;
  }

  async run() {
    const allSpaces = await this.getSpaceListForMigrations();
    if (allSpaces.length === 0) {
      this.logger.debug('No spaces or index found for index migration');
      return;
    }
    this.logger.debug(
      `Starting index migration for rule migrations for spaces :${allSpaces.join(', ')}`
    );
    for (const spaceId of allSpaces) {
      const migrator = new RuleMigrationSpaceIndexMigrator(
        spaceId,
        this.esClient,
        this.logger,
        this.ruleMigrationIndexAdapters
      );
      await migrator.run();
    }
    this.logger.debug('Finished index migration for rule migrations successfully');
  }
}
