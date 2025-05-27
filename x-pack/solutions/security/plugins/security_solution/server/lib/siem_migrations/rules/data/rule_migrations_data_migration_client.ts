/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { Script, BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { RuleMigrationLastExecution } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import type { StoredSiemMigration } from '../types';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';
import { isNotFoundError } from './utils';

export class RuleMigrationsDataMigrationClient extends RuleMigrationsDataBaseClient {
  async create(): Promise<string> {
    const migrationId = uuidV4();
    const index = await this.getIndexName();
    const profileUid = await this.getProfileUid();
    const createdAt = new Date().toISOString();

    await this.esClient
      .create({
        refresh: 'wait_for',
        id: migrationId,
        index,
        document: {
          created_by: profileUid,
          created_at: createdAt,
          status: SiemMigrationTaskStatus.READY,
        },
      })
      .catch((error) => {
        this.logger.error(`Error creating migration ${migrationId}: ${error}`);
        throw error;
      });

    return migrationId;
  }

  /**
   *
   * Gets the migration document by id or returns undefined if it does not exist.
   *
   * */
  async get({ id }: { id: string }): Promise<StoredSiemMigration | undefined> {
    const index = await this.getIndexName();
    return this.esClient
      .get<StoredSiemMigration>({
        index,
        id,
      })
      .then(this.processHit)
      .catch((error) => {
        if (isNotFoundError(error)) {
          return undefined;
        }
        this.logger.error(`Error getting migration ${id}: ${error}`);
        throw error;
      });
  }

  /**
   * Gets all migrations from the index.
   */
  async getAll(): Promise<StoredSiemMigration[]> {
    const index = await this.getIndexName();
    return this.esClient
      .search<StoredSiemMigration>({
        index,
        size: 10000, // Adjust size as needed
        query: {
          match_all: {},
        },
        _source: true,
      })
      .then(this.processResponseHits)
      .catch((error) => {
        this.logger.error(`Error getting all migrations: ${error}`);
        throw error;
      });
  }

  /**
   *
   * Prepares bulk ES delete operation for a migration document based on its id.
   *
   */
  async prepareDelete({ id }: { id: string }): Promise<BulkOperationContainer[]> {
    const index = await this.getIndexName();
    const migrationDeleteOperation = {
      delete: {
        _index: index,
        _id: id,
      },
    };

    return [migrationDeleteOperation];
  }

  async updateLastExecution({
    id,
    lastExecutionParams,
  }: {
    id: string;
    lastExecutionParams: RuleMigrationLastExecution;
  }): Promise<void> {
    this.logger.info(`Updating last execution params for migration ${id}`);
    const index = await this.getIndexName();

    const painlessUpdateScriptLines = [];
    if (lastExecutionParams.error) {
      painlessUpdateScriptLines.push(
        `ctx._source.last_execution.error = "${lastExecutionParams.error}";`
      );
    }

    if (lastExecutionParams.started_at) {
      painlessUpdateScriptLines.push(
        `ctx._source.last_execution.started_at = "${lastExecutionParams.started_at}";`
      );
    }

    if (lastExecutionParams.ended_at) {
      painlessUpdateScriptLines.push(
        `ctx._source.last_execution.ended_at = "${lastExecutionParams.ended_at}";`
      );
    }

    if (lastExecutionParams.is_aborted) {
      painlessUpdateScriptLines.push(
        `ctx._source.last_execution.is_aborted = ${lastExecutionParams.is_aborted};`
      );
    }

    const script: Script = {
      source: `
        if (ctx._source.last_execution == null) {
          ctx._source.last_execution = [:];
        }
      ${painlessUpdateScriptLines.join('\n')}
  `,
    };

    await this.esClient.update({
      index,
      id,
      refresh: 'wait_for',
      script,
    });
  }
}
