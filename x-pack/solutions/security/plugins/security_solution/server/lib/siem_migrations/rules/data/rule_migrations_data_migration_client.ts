/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { RuleMigrationLastExecution } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import type { StoredSiemMigration } from '../types';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';
import { isNotFoundError } from './utils';
import { MAX_ES_SEARCH_SIZE } from '../constants';

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
    this.logger.info('Getting all migrations');
    const index = await this.getIndexName();
    return this.esClient
      .search<StoredSiemMigration>({
        index,
        size: MAX_ES_SEARCH_SIZE, // Adjust size as needed
        query: {
          match_all: {},
        },
        _source: true,
      })
      .then((result) => this.processResponseHits(result))
      .catch((error) => {
        this.logger.error(`Error getting all migrations:- ${error}`);
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

  /**
   * Sets `is_aborted` flag for migration document
   */
  async setIsAborted({ id }: { id: string }): Promise<void> {
    this.logger.info(`Saving migration ${id} as aborted`);

    await this.updateLastExecution({
      id,
      lastExecutionParams: {
        is_aborted: true,
      },
    });
  }

  /**
   * Saves a migration as failed, updating the last execution parameters with the provided error message.
   */
  async saveAsFailed({ id, error }: { id: string; error: string }): Promise<void> {
    this.logger.info(`Saving migration ${id} as failed with error: ${error}`);

    await this.updateLastExecution({
      id,
      lastExecutionParams: {
        error,
        ended_at: new Date().toISOString(),
      },
    });
  }

  /**
   * Saves a migration as started, updating the last execution parameters with the current timestamp.
   */
  async saveAsStarted({
    id,
    connectorId,
  }: {
    id: string;
    connectorId: RuleMigrationLastExecution['connector_id'];
  }): Promise<void> {
    this.logger.info(`Saving migration ${id} as started`);

    await this.updateLastExecution({
      id,
      lastExecutionParams: {
        started_at: new Date().toISOString(),
        connector_id: connectorId,
        is_aborted: false,
        error: null,
        ended_at: null,
      },
    });
  }

  /**
   * Saves a migration as ended, updating the last execution parameters with the current timestamp.
   */
  async saveAsEnded({ id }: { id: string }): Promise<void> {
    this.logger.info(`Saving migration ${id} as ended`);
    await this.updateLastExecution({
      id,
      lastExecutionParams: {
        ended_at: new Date().toISOString(),
      },
    });
  }

  /**
   * Updates the last execution parameters for a migration document.
   */
  private async updateLastExecution({
    id,
    lastExecutionParams,
  }: {
    id: string;
    lastExecutionParams: RuleMigrationLastExecution;
  }): Promise<void> {
    this.logger.info(`Updating last execution params for migration ${id}`);
    const index = await this.getIndexName();

    await this.esClient
      .update({
        index,
        id,
        refresh: 'wait_for',
        doc: {
          last_execution: lastExecutionParams,
        },
        retry_on_conflict: 1,
      })
      .catch((error) => {
        this.logger.error(`Error updating last execution for migration ${id}: ${error}`);
        throw error;
      });
  }
}
